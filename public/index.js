
import './socket.io/socket.io.js';

const socket = io();

globalThis.theApp = {
    socket: socket,
    currentRoomName: ''
}

theApp.test = {
    reqRoomsInfo: async () => {
        socket.emit('reqRooms', (evt) => {
            console.log(evt);
        });
    }

}


async function main() {
    // console.log(socket.connected);

    const enterRoomUI = document.querySelector('#enterRoom');
    const chatUI = document.querySelector('#chatUI');
    const msgTxtList = document.querySelector('#msgTxtList');
    const loginUI = document.querySelector('#loginUI');


    function addMsgTextList(msg) {
        const _ul = msgTxtList.querySelector('ul');
        const li = document.createElement('li');
        li.innerText = msg;
        _ul.appendChild(li);

        console.log(msgTxtList.scrollHeight)
        _ul.scrollTop = _ul.scrollHeight; // scroll to bottom


    }

    ////////////////////////////////////////////////////////////////////////////////
    // client-side
    socket.on("connect", () => {
        console.log("connected");
        // console.log(socket.rooms);
        document.querySelector('#socketStatus').innerHTML =
            `<p>socket.id: ${socket.id}</p> <p>connected: ${socket.connected ? "success" : "false"}</p>`;
        // enterRoomUI.hidden = false;
        loginUI.hidden = false;
    });

    socket.on("disconnect", () => {
        // console.log(socket.id); // undefined
    });

    socket.on("joinRoom", (evt) => {
        chatUI.querySelector('#userCount').innerText = evt.userCount;
        addMsgTextList(`${evt.user.username} joined`);

    });
    socket.on("disconnectUser", (evt) => {
        console.log(evt);

        socket.emit('reqRoomInfo', theApp.currentRoomName, (evt) => {
            console.log(evt);
            chatUI.querySelector('#userCount').innerText = evt.userCount;
        });
    });

    socket.on('message', (evt) => {
        console.log(evt);
        addMsgTextList( `${evt.user.username} : ${evt.msg}` );
    });

    ////////////////////////////////////////////////////////////////////////////////
    // ui handlers

    document.querySelector("#loginBtn").addEventListener('click', (evt) => {
        const userName = document.querySelector('#userName').value;
        socket.emit('login', {
            name : userName
        }, (evt) => {
            console.log(evt);
            loginUI.hidden = true;
            enterRoomUI.hidden = false;
            document.querySelector('#socketStatus').innerText =
            `socket.id: ${socket.id} userName: ${userName}`;
        });
    });

    enterRoomUI.querySelector('button').addEventListener('click', async () => {
        const roomName = enterRoomUI.querySelector('input').value;
        enterRoomUI.hidden = true;
        chatUI.hidden = false;

        socket.emit('enterRoom', roomName, (evt) => {
            console.log(evt);
            chatUI.querySelector('#info').innerText = `${evt.roomName}`;
            theApp.currentRoomName = roomName;
            chatUI.querySelector('#userCount').innerText = evt.userCount;
        });
    });

    chatUI.querySelector('#sendMsg').addEventListener('click', async () => {
        const msg = chatUI.querySelector('#msg').value;
        chatUI.querySelector('#msg').value = '';
        addMsgTextList(msg);
        socket.emit('message',theApp.currentRoomName,msg);
    });

}

export default main; 