# TicTacToe Game for Mira Astor of Nibiru, on her birthday 2024.

Look of website:
![image](https://github.com/user-attachments/assets/bacd5461-4d71-4e97-a6a3-2d8e9c4babef)

Channel link: https://space.bilibili.com/5333581

## Code details

The inital stucture of the code was written by chatGPT, then adapted into this game. ChatGPT has been invaluable, if not only just for teaching me about Socket.io.

There seems to be sequrity risks from using user input directly, and writing messages from the server to the client, as these messages can be caught and changed by a 3rd party. Should have instead sent keys that have associated messages in the client, would be less vulnerable and also send less information. Happy to learn this on a low risk project. However, this is not a critical system, users should only be exposed to having their messages from the server changed, like changing where a piece is place, or just reciving gameover as feedback for opponents play.


The code is not very consistent, but I am happy I even got 'code.js' and 'Client.js' to interact despite both running on the client.
