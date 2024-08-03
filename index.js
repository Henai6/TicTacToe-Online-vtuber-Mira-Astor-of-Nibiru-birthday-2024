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

// Function to handle leaving all roms
const leaveRooms = (socket) => {
    for (const roomName in rooms) {
        const room = rooms[roomName];
        const userIndex = room.users.findIndex(user => user.id === socket.id);
        if (userIndex !== -1) {
            const [user] = room.users.splice(userIndex, 1);
            socket.leave(roomName);
            socket.to(roomName).emit('message', `${user.name} has left the room.`);
            if (room.queue.length > 0) {
                const nextUser = room.queue.shift();
                room.users.push(nextUser);
                io.to(nextUser.id).emit('joinRoom', { roomName, userName: nextUser.name }, (response) => {
                    if (response.success) {
                        io.to(roomName).emit('message', `${nextUser.name} has joined the room from the queue.`);
                    }
                });
            }
            if (room.users.length === 0) {
                delete rooms[roomName];
                emitRooms(); // Emit updated list of rooms
                if (gameStatus[roomName]) {
                    delete gameStatus[roomName];
                }
            }
        }
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

// Handle new connections
io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);
    emitRooms();

    // Handle joining a room
    socket.on('joinRoom', ({ roomName, userName }, callback) => {
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
                const [user1, user2] = rooms[roomName].users;
                let order = Math.random();
                if (order > 0.5) {
                    joinMessage = `X - ${user1.name} VS. ${user2.name} - O`;
                    gameStatus[roomName] = {
                        player1: user1,
                        player2: user2,
                        board: Array(9).fill(0), // Example 3x3 board
                        currentTurn: user1.name
                    };
                } else {
                    joinMessage = `X - ${user2.name} VS. ${user1.name} - O`;
                    gameStatus[roomName] = {
                        player1: user2,
                        player2: user1,
                        board: Array(9).fill(0), // Example 3x3 board
                        currentTurn: user1.name
                    };
                }
                io.to(gameStatus[roomName].player1.id).emit('turn', `Your turn!`);
                io.to(gameStatus[roomName].player2.id).emit('turn', `Opponent '${gameStatus[roomName].player1.name}'s turn`);
            }

            callback({ success: true, message: joinMessage });
            socket.to(roomName).emit('message', joinMessage);
            
        } else {
            if (rooms.length < MAX_ROOMS_CAPACITY) {
                rooms[roomName].queue.push({ id: socket.id, name: userName });
                callback({ success: false, message: `Room is full. ${userName} is in the queue.` });
            } else {
                callback({ success: false, message: `Too many rooms.` });
            }
        }

        console.log(rooms);
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

        if (gameStatus[roomName].currentTurn === userName && !(position < 0 || position > 8) ) {
            if (gameStatus[roomName].player1.name === userName)  { //If player is circle
                if (gameStatus[roomName].board[position] === 0) {
                    gameStatus[roomName].board[position] = 1;

                    if (checkWin(gameStatus[roomName].board)) {
                        io.to(roomName).emit('turn', `'${gameStatus[roomName].player1.name}' WIN!`)
                    } else {
                        io.to(gameStatus[roomName].player2.id).emit('turn', `Your turn!`);
                        io.to(gameStatus[roomName].player1.id).emit('turn', `Opponent '${gameStatus[roomName].player1.name}'s turn`);
                        gameStatus[roomName].currentTurn = gameStatus[roomName].player2.name;
                    }
                    io.to(roomName).emit('board', gameStatus[roomName].board);
                    
                    callbackStatus = true;
                } 
            } else { //If player is cross
                if (gameStatus[roomName].board[position] === 0) {
                    gameStatus[roomName].board[position] = 2;
                    
                    if (checkWin(gameStatus[roomName].board)) {
                        io.to(roomName).emit('turn', `'${gameStatus[roomName].player2.name}' WIN!`)
                    } else {
                        io.to(gameStatus[roomName].player1.id).emit('turn', `Your turn!`);
                        io.to(gameStatus[roomName].player2.id).emit('turn', `Opponent '${gameStatus[roomName].player1.name}'s turn`);
                        gameStatus[roomName].currentTurn = gameStatus[roomName].player1.name;
                    }
                    io.to(roomName).emit('board', gameStatus[roomName].board);
                    callbackStatus = true;
                } 
            }
        }

        callback({ success: callbackStatus });
    });
});

// Start the server on port 3000
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
