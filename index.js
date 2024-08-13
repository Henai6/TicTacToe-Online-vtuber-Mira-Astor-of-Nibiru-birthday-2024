//Alot of this code was written with the help of ChatGPT (At the very least it gave me a working template).

const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

// Create a new Express application
const app = express();

// Create an HTTP server and bind the Express app to it
const server = http.createServer(app);

// Bind socket.io to the server
const io = socketIo(server);

const MAX_ROOM_CAPACITY = 2;
const MAX_ROOMS_CAPACITY = 20;
const rooms = {}; // To keep track of rooms and their participants
const gameStatus = {};// To keep track of games

// Serve static files (like HTML, CSS, JS) from the "public" directory
app.use(express.static('public'));

// Function to emit the list of rooms
const emitRooms = () => {
    const roomNames = Object.keys(rooms);
    io.emit('Rooms', roomNames);
};

const removeFromRoom = (userSocket, roomName) => {
    const room = rooms[roomName];
    const userIndex = room.users.findIndex(user => user.id === userSocket.id);
    let nextUser;
    if (userIndex !== -1) {
        const [user] = room.users.splice(userIndex, 1);
        delete gameStatus[roomName];

        userSocket.to(roomName).emit('message', `${user.name} has left the room.`);
        userSocket.leave(roomName);

        if (room.queue.length > 0) {
            nextUser = room.queue.shift();
            room.users.push(nextUser);

            let nextSocket =  io.sockets.sockets.get(nextUser.id);
            nextSocket.join(roomName);
            let joinMessage = SetupGame(roomName);
            userSocket.to(roomName).emit('message', joinMessage);
        }
        if (room.users.length === 0) {
            delete rooms[roomName];
            emitRooms(); // Emit updated list of rooms
        }
    }
    return nextUser;
}

// Function to handle leaving all roms
const leaveRooms = (socket) => {
    for (const roomName in rooms) {
        const room = rooms[roomName];
        removeFromRoom(socket, roomName);
    }
};

const checkWin = (board) => {
    // Check rows
    for (let i = 0; i < 3; i++) {
        if (board[i * 3] === board[i * 3 + 1] && board[i * 3 + 1] === board[i * 3 + 2] && board[i * 3] !== 0) {
            return true;
        }
    }

    // Check columns
    for (let j = 0; j < 3; j++) {
        if (board[j] === board[j + 3] && board[j + 3] === board[j + 6] && board[j] !== 0) {
            return true;
        }
    }

    // Check diagonals
    if (board[0] === board[4] && board[4] === board[8] && board[0] !== 0) {
        return true;
    }
    if (board[2] === board[4] && board[4] === board[6] && board[2] !== 0) {
        return true;
    }

    // No win found
    return false;
}

const SetupGame = (roomName) => {
    const [user1, user2] = rooms[roomName].users;
    let order = Math.random();
    if (order > 0.5) {
        joinMessage = `O - ${user1.name} VS. ${user2.name} - X`;
        gameStatus[roomName] = {
            player1: user1,
            player2: user2,
            board: Array(9).fill(0), 
            currentTurn: user1.name
        };
    } else {
        joinMessage = `O - ${user2.name} VS. ${user1.name} - X`;
        gameStatus[roomName] = {
            player1: user2,
            player2: user1,
            board: Array(9).fill(0), 
            currentTurn: user2.name
        };
    }
    io.to(gameStatus[roomName].player1.id).emit('turn', `Your turn!`);
    io.to(gameStatus[roomName].player2.id).emit('turn', `Opponent '${gameStatus[roomName].player1.name}'s turn`);
    io.to(roomName).emit('board', gameStatus[roomName].board);
    return joinMessage;
}


const joinRoom = (socket, roomName, userName, callback) => {
    roomName = roomName.toLowerCase().trim();
        leaveRooms(socket); // Ensure the user leaves any current room before joining a new one

        if (!rooms[roomName]) {
            rooms[roomName] = { users: [], queue: [] };
            emitRooms();
        }

        if (rooms[roomName].users.length < MAX_ROOM_CAPACITY) {
            socket.join(roomName);
            rooms[roomName].users.push({ id: socket.id, name: userName });
            
            let joinMessage;
            if (rooms[roomName].users.length < 2) {
                joinMessage = `In room '${roomName}', waiting for players...`;
            } else {
                joinMessage = SetupGame(roomName);
            }

            callback({ success: true, message: joinMessage });
            socket.to(roomName).emit('message', joinMessage);
            
        } else {
            if (Object.keys(rooms).length  < MAX_ROOMS_CAPACITY) {
                if (!rooms[roomName].queue.some(user => user.name === userName)) {
                    rooms[roomName].queue.push({ id: socket.id, name: userName });
                }
                callback({ success: false, message: `Room is full. ${userName} is in the queue.` });
            } else {
                callback({ success: false, message: `Too many rooms.` });
            }
        }

        console.log(rooms);
}

// Handle new connections
io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);
    emitRooms();

    // Handle joining a room
    socket.on('joinRoom', ({ roomName, userName }, callback) => {
        joinRoom(socket, roomName, userName, callback);
        
    });

    // Handle chat messages
    socket.on('chatMessage', ({ roomName, userName, message }) => {
        const room = rooms[roomName];
        if (room && room.users.find(user => user.id === socket.id)) {
            io.to(roomName).emit('message', `${userName}: ${message}`);
        }
    });

    // Handle disconnect
    socket.on('disconnect', () => {
        console.log('A user disconnected:', socket.id);
        leaveRooms(socket); // Call the function to handle the logic for leaving the current room
        console.log(rooms);
    });

    socket.on('playMove', ({roomName, position, userName}, callback) => {
        let callbackStatus = false;
        if (typeof roomName === 'undefined' || typeof userName === 'undefined' || typeof position === 'undefined' || !gameStatus[roomName]) {
            callback({ success: callbackStatus });
            return;
        }

        let thisGame = gameStatus[roomName];
        if (thisGame.currentTurn === userName && !(position < 0 || position > 8) ) {
            if (thisGame.board[position] === 0) { //If move was valid
                let playingPlayer = thisGame.player2;
                let losingPlayer = thisGame.player1;
                if (thisGame.player1.name === userName)  { //If player is circle
                    playingPlayer = thisGame.player1;
                    losingPlayer = thisGame.player2;

                    thisGame.board[position] = 1;
                }
                else {
                    thisGame.board[position] = 2;
                }
                io.to(roomName).emit('board', thisGame.board);

                if (checkWin(thisGame.board) || !thisGame.board.includes(0)) {
                    socket.to(roomName).emit('turn', `'${playingPlayer.name}' WIN!`);

                    let loserSocket = io.sockets.sockets.get(losingPlayer.id);
                    if (losingPlayer.name.toLowerCase().trim() === 'mira') {
                        loserSocket = io.sockets.sockets.get(playingPlayer.id);
                    }

                    
                    io.to(losingPlayer.id).emit('disconnectGame');
                    const nextUser = removeFromRoom(loserSocket, roomName);
                    io.to(losingPlayer.id).emit('message', `You were ejected from the room.`);
                    if (nextUser) {
                        io.to(playingPlayer.id).emit('message', `${nextUser.name} has joined the room from the queue.`);
                    } else {
                        io.to(playingPlayer.id).emit('message', `Queue was empty`);
                    }

                    //It does succeed, but isMyTurn doesn't update from 'turn' for some reason.
                    callbackStatus = false;
                } else {
                    io.to(losingPlayer.id).emit('turn', `Your turn!`);
                    io.to(playingPlayer.id).emit('turn', `Opponent '${losingPlayer.name}'s turn`);
                    thisGame.currentTurn = losingPlayer.name;
                    callbackStatus = true;
                }
            }
        }

        callback({ success: callbackStatus });
    });
});

// Start the server on port 3000 (Change to 80 when running on Aliyun. Could setup reverse proxy, but not my pc).
const PORT = process.env.PORT || 80;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});


module.exports = app;