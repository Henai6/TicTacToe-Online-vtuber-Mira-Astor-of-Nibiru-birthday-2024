const socket = io();
export default socket;

const turnMessage = document.getElementById('turn');

export let roomName;
export let userName;

export let ticBoard = Array(9).fill(0);
export let curHoverSquare = -1;
export let isMyTurn = false;

export function setCurHoverSquare(value) {
    curHoverSquare = value;
}
export function setTicBoard(value) {
    ticBoard = value;
}
export function setTurn(value) {
    isMyTurn = value;
}

document.getElementById('joinButton').addEventListener('click', () => {
    roomName = document.getElementById('roomNameInput').value.toLowerCase().trim();
    userName = document.getElementById('userNameInput').value.trim();
    socket.emit('joinRoom', { roomName, userName }, (response) => {
        document.getElementById('status').textContent = response.message;
    });
    turnMessage.innerHTML = '';
});

socket.on('message', (message) => {
    document.getElementById('status').textContent = message;
});


const roomList = document.getElementById('roomList');

// Listen for the 'Rooms' event from the server
socket.on('Rooms', (rooms) => {
    // Clear the current room list
    roomList.innerHTML = '';

    // Update the room list with the received rooms
    rooms.forEach((room) => {
        const li = document.createElement('li');
        li.textContent = room;
        roomList.appendChild(li);
    });
});

const audio = document.getElementById('myAudio');

socket.on('turn', (message) => {
    //Update Board
    //Enable Highlight
    //Change text color
    //Make sound?
    turnMessage.innerHTML = message;
    curHoverSquare = 0;
    if (!isMyTurn) {
        audio.play(); 
    }
    isMyTurn = true;
});