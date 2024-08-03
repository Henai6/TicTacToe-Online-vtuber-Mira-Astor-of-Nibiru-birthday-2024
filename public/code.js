//https://www.geeksforgeeks.org/how-to-generate-qr-codes-with-a-custom-logo-using-python/

import socket, { roomName, userName, ticBoard, curHoverSquare, setCurHoverSquare, setTicBoard, isMyTurn, setTurn } from './Client.js';

const canvas = document.getElementById("canvas");
const ctx = canvas.getContext('2d');

const img = new Image();
img.src = 'Images/BaldMira.png'; 

const ilines = new Image();
ilines.src = 'Images/lines.png'; 

const circles = [];
for (let i = 0; i < 9; i++) {
    circles[i] = new Image();
    circles[i].src = `Images/circle${i + 1}.png`;
    console.log(circles[i].src);
    circles[i].onload = function() {
        imagesLoad();
    }
}

const crosses = [];
for (let i = 0; i < 9; i++) {
    crosses[i] = new Image();
    crosses[i].src = `Images/cross${i + 1}.png`;
    console.log(crosses[i].src);
    crosses[i].onload = function() {
        imagesLoad();
    }
}


let imagesLoaded = 0;

// Draw the image onto the canvas when it has loaded
img.onload = function() {
    imagesLoad();
    console.log("test");
};

ilines.onload = function() {
    imagesLoad();
};



const ticPositions = [
    { x: 320, y: 60 },
    { x: 430, y: 45 },
    { x: 545, y: 65 },
    { x: 285, y: 140 },
    { x: 410, y: 130 },
    { x: 560, y: 145 },
    { x: 300, y: 230 },
    { x: 420, y: 230 },
    { x: 547, y: 240 }
];

export function imagesLoad() {
    if (imagesLoaded >= 19) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, -50);
        ctx.drawImage(ilines, 280, 50);

        // Draw images based on the ticBoard state
        ticBoard.forEach((value, index) => {
            const pos = ticPositions[index]; // Get the position for the current index
            if (value === 1) {
                // Draw circle
                ctx.drawImage(circles[index], pos.x, pos.y);
            } else if (value === 2) {
                // Draw cross
                ctx.drawImage(crosses[index], pos.x, pos.y);
            }
        });

        /*
        ctx.drawImage(circles[0], 320, 60);
        ctx.drawImage(circles[1], 430, 45);
        ctx.drawImage(circles[2], 545, 65);

        ctx.drawImage(circles[3], 285, 140);
        ctx.drawImage(circles[4], 410, 130);
        ctx.drawImage(circles[5], 560, 145);

        ctx.drawImage(circles[6], 300, 230);
        ctx.drawImage(circles[7], 420, 230);
        ctx.drawImage(circles[8], 547, 240);
        

        ctx.drawImage(crosses[0], 320, 60);
        ctx.drawImage(crosses[1], 430, 45);
        ctx.drawImage(crosses[2], 545, 65);

        ctx.drawImage(crosses[3], 285, 140);
        ctx.drawImage(crosses[4], 410, 130);
        ctx.drawImage(crosses[5], 560, 145);

        ctx.drawImage(crosses[6], 300, 230);
        ctx.drawImage(crosses[7], 420, 230);
        ctx.drawImage(crosses[8], 547, 240);
        */
    } else  {
        imagesLoaded++;
    }
}

const squares = [
    { x1: 235, y1: 39, x2: 329, y2: 98 },   // top left     0
    { x1: 330, y1: 39, x2: 434, y2: 96 },   // top mid      1
    { x1: 435, y1: 39, x2: 511, y2: 101 },  // top right    2
    { x1: 229, y1: 99, x2: 318, y2: 174 },  // mid left     3
    { x1: 319, y1: 102, x2: 440, y2: 180 },  // mid mid     4
    { x1: 441, y1: 102, x2: 533, y2: 181 }, // mid right    5
    { x1: 229, y1: 182, x2: 321, y2: 248 }, // bot left     6
    { x1: 322, y1: 182, x2: 435, y2: 255 }, // bot mid      7
    { x1: 436, y1: 182, x2: 537, y2: 249 }  // bot right    8
];

function drawHoverCircle(x, y) {
    ctx.beginPath();
    ctx.arc(x, y, 20, 0, 2 * Math.PI); // Draw circle with radius 20
    ctx.strokeStyle = 'magenta'; // Circle color
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.closePath();
}

canvas.addEventListener('mousemove', (event) => {
    if (isMyTurn) {
        const rect = canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        
        let hoverSquare = -1;
        for (let i = 0; i < squares.length; i++) {
            const square = squares[i];
            if (x >= square.x1 && x <= square.x2 && y >= square.y1 && y <= square.y2) {
                hoverSquare = i;
                break;
            }
        }
        
        if (curHoverSquare !== hoverSquare) {
            setCurHoverSquare(hoverSquare);
            imagesLoad();

            //HARDCODED SCALE 
            const scale = 960 / 768; //Scale factor


            if (hoverSquare !== -1 && ticBoard[hoverSquare] === 0) {
                const square = squares[hoverSquare];
                ctx.strokeStyle = 'magenta';
                ctx.lineWidth = 3;
                ctx.strokeRect(square.x1 * scale, square.y1 * scale, (square.x2 - square.x1) *scale, (square.y2 - square.y1)* scale);
            }
        }
    }

    //drawHoverCircle(x, y);
});

canvas.addEventListener('mousedown', (event) => {
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    console.log(`Clicked at: (${x}, ${y})`);
    
    const squareNumber = getSquareNumber(x, y);
    if (squareNumber !== -1) {
        playMove(squareNumber);
    }
});

function getSquareNumber(x, y) {
    // Check if the click is within any of the squares
    for (let i = 0; i < squares.length; i++) {
        const square = squares[i];
        if (x >= square.x1 && x <= square.x2 && y >= square.y1 && y <= square.y2) {
            return i;
        }
    }
    return -1; // No square matched
}


//socket.on('playMove', ({roomName, position, userName}) => {

/*socket.emit('joinRoom', { roomName, userName }, (response) => {
    document.getElementById('status').textContent = response.message;
});*/

function playMove(number) {
    const position = number;
    socket.emit('playMove', { roomName, position, userName }, (response) => {
        if (response.success) {
            //Turn changes
            console.log("Move was accepted, ain't no way");
            setTurn(false);
        }
        else {
            //Turn did not change
            console.log("Your yeeyeeass move was not accepted");
        }
    });
}


socket.on('board', (board) => {
    setTicBoard(board);
    imagesLoad();
});