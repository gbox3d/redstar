import express from 'express'

import dotenv from "dotenv"


import http from 'http'
import fs from 'fs-ext'
import SocketIO from "socket.io";
import udpServer from './server/udpServer'
import { env } from 'process';

// console.log(SocketIO_version);

dotenv.config({ path: '.env' }); //환경 변수에 등록 

console.log(`run mode : ${process.env.NODE_ENV}`);

const app = express();
const udpApp = new udpServer({
  port : process.env.UDP_PORT
})

app.use('/', express.static(`./public`));

//순서 주의 맨 마지막에 나온다.
app.all('*', (req, res) => {
  res
    .status(404)
    .send('oops! resource not found')
});

//https 서버하고 연동시켜 실행시킵니다
const options = {
  // key: fs.readFileSync('/home/ubiqos/work/project/cert_files/2022_2/private.key'),
  // cert: fs.readFileSync('/home/ubiqos/work/project/cert_files/2022_2/certificate.crt'),
  // ca: fs.readFileSync('/home/ubiqos/work/project/cert_files/2022_2/ca_bundle.crt'),
};
// https 서버를 만들고 실행시킵니다
// const httpServer = http.createServer(options, app)
const httpServer = http.createServer(options, app)

//socket io
const ioServer = SocketIO(httpServer);

ioServer.on("connection", (socket) => {

  console.log('connected', socket.id, socket.handshake.address);

  socket.onAny((eventName, playload) => {
    // ...
    if( typeof playload !== 'function' ) {
      console.log(`eventName: ${eventName},socketid:${socket.id}`,playload);
    }
    else {
      console.log(`eventName: ${eventName},socketid:${socket.id}`);
    }
  });

  socket.on("disconnect", () => {
    console.log("disconnected", socket.id);
  });

  socket.on("getDeviceList", (done) => {

    done({
      devList : udpApp.getDeviceList()
    });

  });

  socket.on("nutRelay", (packet,done) => {

    switch(packet.cmd) {
      case 'on':
        udpApp.onCallBackRelayOn = (chipid) => {
          // theApp.onCallBackRelayOn = null;
          console.log('on ok' + chipid);
          done({
            chipid : chipid
          });
          
        }
        udpApp.turnOnRelay(packet.devId)
      break;
      case 'off':
        udpApp.onCallBackRelayOff = (chipid) => {
          // theApp.onCallBackRelayOff = null;
          done({
            chipid : chipid
          });
        }
        udpApp.turnOffRelay(packet.devId)
      break;
    }
    

  });

});

httpServer.listen(process.env.PORT, () => {
  console.log(`server run at :  ${process.env.PORT}`)
});

console.log(`app base dir ${__dirname}`)


