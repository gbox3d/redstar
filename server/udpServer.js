// const dgram = require("dgram");
// const theApp = require("./restApi");
// const server = dgram.createSocket("udp4");
// const yargs = require('yargs').argv;
// const fs = require('fs')

import dgram from 'dgram'

const server = dgram.createSocket("udp4");

const oddugiResHeaderSize = 8;
const egcsResHeaderSize = 8;


//----------------------
class udpServer {
    // beastList = {};
    deviceList = {};
    onCallBackRelayOn = null;
    onCallBackRelayOff = null;
    constructor({ port }) {
        let localPort = port

        let deviceList = this.deviceList
        // console.log(this.deviceList)

        server.on("message",  (msg, rinfo)=> {

            let header = msg.readUInt32LE(0);

            if (header == 20220216) //nut relay unit
            {
                let chipId = msg.readUInt32LE(4) // 디바이스 고유 아이디 
                let code = msg.readUInt8(8); // 요청,명령 코드 
                let status = msg.readUInt8(9); // 디바이스측 fsm
                let index = msg.readUInt8(10); // 디바이스의 group index 
                let pktSize = msg.readUInt8(11);
                let extra = [msg.readUInt8(14), msg.readUInt8(15)]

                let _dev = deviceList[chipId];

                if (_dev === undefined) { //디바이스 등록 
                    _dev = {
                        chipId: chipId,
                        dev_type: 'nut_basic',
                        header: header,
                        resHeaderSize: oddugiResHeaderSize,
                        index: index,
                        status_r: status,
                        // status_l: 0,
                        count: 0,
                        at: new Date().getTime(),
                        last_address: rinfo.address,
                        last_port: rinfo.port
                    }
                    deviceList[chipId] = _dev;
                    console.log(`create new device ${_dev.dev_type} , ${_dev.header} , ${_dev.chipId}`)
                }
                else {
                    _dev.index = index;
                    _dev.status_r = status;
                    _dev.at = new Date().getTime()
                    _dev.last_address = rinfo.address
                    _dev.last_port = rinfo.port
                }

                let resBuf = Buffer.alloc(oddugiResHeaderSize)
                resBuf.writeInt32LE(20210406, 0);

                resBuf.writeUInt8(0x01, 4); //확인 커멘드 정의

                //0x01번 패킷에 상태 정보가 날라온다.
                if (code == 0x01) { //ping
                    server.send(
                        resBuf, 0, resBuf.length,
                        rinfo.port, rinfo.address);
                }
                else if (code == 0x11) { //on 에 대한 응답

                    console.log('on ok')

                    this.onCallBackRelayOn?.(_dev.chipId)
                    this.onCallBackRelayOn=null;

                }
                else if (code == 0x12) { //off 에 대한 응답
                    console.log('off ok')
                    this.onCallBackRelayOff?.(chipId)
                    this.onCallBackRelayOff=null;
                }
                else if (code == 0x21) { //read config 에 대한 응답 

                    let _buf = Buffer.from(msg)
                    console.log(`read : ${_buf.slice(pktSize, msg.length).toString('utf-8')}`)
                    _dev.config = _buf.slice(pktSize, msg.length).toString('utf-8')
                }
                else if (code == 0x22) { //save config 에 대한 응답 
                    _dev.config = ""
                    let write_size = msg.readUInt16LE(12);
                    console.log(`${write_size} saved`)
                }

            }
            else {
                console.log(`unknown packet : ${header}, ${rinfo.address}`);
            }
        });

        server.bind(localPort)
        console.log(`udp server bind at : ${localPort}`)
        //-----------------
        function checkDeviceLatencyLoop() {
            // Object.keys(deviceList).map()

            const _loop = () => {
                for (const [key, value] of Object.entries(deviceList)) {
                    // console.log(`${key}: ${value}`);
                    if (value.old_at) {

                        if (value.at > value.old_at) {
                            value.latency = value.at - value.old_at
                            value.old_at = value.at
                        }
                        else {
                            if (value.latency < 30000)
                                value.latency += 3000
                            else value.latency = 99000
                        }

                    }
                    else {
                        value.old_at = value.at
                    }
                }

                setTimeout(_loop, 3000)
            }

            _loop()

        }

        checkDeviceLatencyLoop()

    }
    getDeviceList() {
        return this.deviceList
    }
    turnOnRelay(devId) {
        
        //즉시 전송 시도 
        let _dev = this.deviceList[devId]
        if (_dev) {
            let resBuf = Buffer.alloc(_dev.resHeaderSize)
            resBuf.writeInt32LE(_dev.header, 0);
            resBuf.writeUInt8(0x11, 4); // on cmd
            resBuf.writeUInt8(0x00, 5); // not use
            resBuf.writeUInt8(0x00, 6); // m_extra
            server.send(
                resBuf, 0, resBuf.length,
                _dev.last_port, _dev.last_address); // added missing bracket
        }
        else {
            console.log(`device not found : ${devId}`)
        }
    }
    turnOffRelay(devId) {
        
        //즉시 전송 시도 
        let _dev = this.deviceList[devId]
        if (_dev) {
            let resBuf = Buffer.alloc(_dev.resHeaderSize)
            resBuf.writeInt32LE(_dev.header, 0);
            resBuf.writeUInt8(0x12, 4); // off cmd
            resBuf.writeUInt8(0x00, 5); // not use
            resBuf.writeUInt8(0x00, 6); // m_extra
            server.send(
                resBuf, 0, resBuf.length,
                _dev.last_port, _dev.last_address); // added missing bracket
        }
        else {
            console.log(`device not found : ${devId}`)
        }
    }
}

export default udpServer;
