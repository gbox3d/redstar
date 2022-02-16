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
    beastList = {};
    deviceList = {};
    constructor({ port }) {
        let localPort = port
        
        let deviceList = this.deviceList
        // console.log(this.deviceList)

        server.on("message", function (msg, rinfo) {

            // remote_client = rinfo;
            // console.log(rinfo);
            // console.log(msg);
            // let message = new Buffer.from(`ok : ${msg}`);
            // // server.send(message,0,message.length,rinfo.port,rinfo.address)

            let header = msg.readUInt32LE(0);

            if (header == 20200513 && rinfo.size >= 12) //oddugi Target Unit
            {
                let chipId = msg.readUInt32LE(4)
                let code = msg.readUInt8(8);
                let status = msg.readUInt8(9);
                let index = msg.readUInt8(10);
                let pktSize = msg.readUInt8(11);
                let extra = [msg.readUInt8(14), msg.readUInt8(15)]

                // console.log(`header : ${header} `);
                // console.log(`chipId : ${chipId} `);
                // console.log(`code : ${code} `);
                // console.log(`status : ${status} `);
                // console.log(`index : ${index} `);



                let _dev = deviceList[chipId];

                if (_dev === undefined) {
                    _dev = {
                        dev_type: 'oddugi',
                        header: header,
                        resHeaderSize: oddugiResHeaderSize,
                        index: index,
                        status_r: status,
                        status_l: 0,
                        count: 0,
                        at: new Date().getTime(),
                        last_address: rinfo.address,
                        last_port: rinfo.port
                    }
                    deviceList[chipId] = _dev;
                }
                else {
                    _dev.index = index;
                    _dev.status_r = status;
                    _dev.at = new Date().getTime()
                    _dev.last_address = rinfo.address
                    _dev.last_port = rinfo.port
                }

                let resBuf = Buffer.alloc(oddugiResHeaderSize)
                resBuf.writeInt32LE(20200513, 0);
                resBuf.writeUInt8(0x01, 4);

                if (code == 0x01) { //normal
                    switch (_dev.status_l) {
                        case 0: //ready
                            {
                                _dev.version = extra[0]
                                if (_dev.status_r == 10) {
                                    _dev.count++;
                                    _dev.status_l = 100;
                                    // console.log(_dev.count)
                                }

                            }
                            break;
                        case 10: //up cmd
                            {
                                // console.log('up cmd ' + _dev.status_r)

                                if (_dev.status_r == 0) { //활성 상태
                                    _dev.status_l = 0
                                }
                                else { //비 활성 상태
                                    resBuf.writeUInt8(0x11, 4); //code do on
                                }
                            }
                            break;
                        case 20: //down cmd
                            {
                                if (_dev.status_r == 0) { //활성 상태

                                    resBuf.writeUInt8(0x12, 4); //code off
                                }
                                else { //비 활성 상태
                                    _dev.status_l = 100
                                }

                            }
                            break;
                        case 100:
                            break;

                    }

                    resBuf.writeUInt8(_dev.status_l, 5); //m_status
                    resBuf.writeUInt8(0, 6); //m_extra

                    server.send(
                        resBuf, 0, resBuf.length,
                        rinfo.port, rinfo.address); // added missing bracket

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
            else if (header == 20200519) //사로제어 
            {

                let chipId = msg.readUInt32LE(4)
                let code = msg.readUInt8(8);
                let status = msg.readUInt8(9);
                let index = msg.readUInt8(10);
                let pktSize = msg.readUInt8(11);
                let fire_count = msg.readUInt16LE(12);
                let extra = [msg.readUInt8(14), msg.readUInt8(15)]

                // console.log(`chipId : ${chipId} , code : ${code}, status : ${status},${pktSize}`)

                let _dev = deviceList[chipId];

                if (_dev === undefined) {
                    _dev = {
                        dev_type: 'egcs',
                        header: header,
                        resHeaderSize: egcsResHeaderSize,
                        index: index,
                        status_r: status,
                        status_l: 0,
                        fire_count: 0,
                        at: new Date().getTime(),
                        last_address: rinfo.address,
                        last_port: rinfo.port
                    }
                    deviceList[chipId] = _dev;
                }
                else {
                    _dev.index = index;
                    _dev.status_r = status;
                    _dev.at = new Date().getTime()
                    _dev.last_address = rinfo.address
                    _dev.last_port = rinfo.port
                    _dev.fire_count = parseInt(fire_count)
                }

                let resBuf = Buffer.alloc(egcsResHeaderSize)
                resBuf.writeInt32LE(header, 0);
                resBuf.writeUInt8(0x01, 4);


                if (code == 0x01) //상태동기화 패킷 처리 
                {
                    switch (_dev.status_l) {
                        case 0: //ready
                            {
                                _dev.version = extra[0]
                            }
                            break;
                        case 10: //ready to fire
                            {
                                if (_dev.status_r == 10) {
                                    _dev.status_l = 100
                                }
                                else { //비 활성 상태

                                    // console.log(`fire count : ${_dev.fire_count}`)
                                    resBuf.writeUInt8(0x11, 4); //ready to fire
                                    //fire_max_count 는 rest api처리하는 쪽에서 정해진다.
                                    resBuf.writeUInt16LE(_dev.fire_max_count, 5)

                                }
                            }
                            break;
                        case 20: // stop fire
                            {
                                if (_dev.status_r == 0) {
                                    _dev.status_l = 100
                                }
                                else {
                                    resBuf.writeUInt8(0x12, 4); //stop to fire

                                }

                            }
                            break;

                        case 100:
                            break;

                    }

                    // resBuf.writeUInt8(_dev.status_l, 5); //m_status
                    // resBuf.writeUInt8(0, 6); //m_extra

                    server.send(
                        resBuf, 0, resBuf.length,
                        rinfo.port, rinfo.address); // added missing bracket

                }
                else if (code == 0x21) //read config 에 대한 응답 
                {
                    // console.log(_dev)
                    // console.log(`chipId : ${chipId} , code : ${code}, status : ${status},${pktSize}`)
                    let _buf = Buffer.from(msg)
                    console.log(_buf.slice(pktSize, msg.length).toString('utf-8'))
                    _dev.config = _buf.slice(pktSize, msg.length).toString('utf-8')
                }
                else if (code == 0x22) //save config 에 대한 응답 
                {
                    _dev.config = ""
                    let write_size = msg.readUInt16LE(12);
                    console.log(`${write_size} saved`)
                }
                else if (code == 0x69) { //로컬아이피 요청에대한 응답 
                    let _buf = Buffer.from(msg)
                    // console.log(_buf.slice(pktSize, msg.length).toString('utf-8'))
                    try {
                        let __str = _buf.slice(pktSize, msg.length).toString('utf-8')
                        // let __str = '{"code":5,"ip":"192.168.4.29"}'
                        // console.log(__str)
                        let _json = JSON.parse(__str)
                        switch (_json.code) {
                            case 5:
                                {
                                    _dev.local_ip = _json.ip
                                }
                                break;
                        }

                    } catch (e) {
                        console.log(e)

                    }



                }

            }
            else if (header == 20200531) // beast packet
            {
                let _id = msg.readUInt32LE(4)
                let code = msg.readUInt8(8);
                // console.log(`${_id},${code}`)
                let _beast = beastList[_id]
                if (_beast === undefined) {
                    _beast = {
                        // id : _id,
                        at: new Date().getTime(),
                        last_address: rinfo.address,
                        last_port: rinfo.port
                    }
                }
                else {
                    _beast.at = new Date().getTime()
                    _beast.last_address = rinfo.address
                    _beast.last_port = rinfo.port
                }

                beastList[_id] = _beast

            }
            else if (header == 20210406) //nut basic unit
            {
                let chipId = msg.readUInt32LE(4)
                let code = msg.readUInt8(8);
                let status = msg.readUInt8(9);
                let index = msg.readUInt8(10);
                let pktSize = msg.readUInt8(11);
                let extra = [msg.readUInt8(14), msg.readUInt8(15)]

                let _dev = deviceList[chipId];

                if (_dev === undefined) {
                    _dev = {
                        dev_type: 'nut_basic',
                        header: header,
                        resHeaderSize: oddugiResHeaderSize,
                        index: index,
                        status_r: status,
                        status_l: 0,
                        count: 0,
                        at: new Date().getTime(),
                        last_address: rinfo.address,
                        last_port: rinfo.port
                    }
                    deviceList[chipId] = _dev;
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
                resBuf.writeUInt8(0x01, 4);

                if (code == 0x01) { //normal
                    // console.log(_dev.status_l)
                    switch (_dev.status_l) {
                        case 0: //ready
                            {
                                _dev.version = extra[0]
                                if (_dev.status_r == 10) {
                                    _dev.count++;
                                    _dev.status_l = 100;
                                    // console.log(_dev.count)
                                }
                                resBuf.writeUInt8(0, 6); //m_extra

                            }
                            break;
                        case 10: //up cmd
                            {
                                console.log('up cmd ' + _dev.status_r)

                                if (_dev.status_r == 0) { //활성 상태
                                    _dev.status_l = 0
                                }
                                else { //비 활성 상태
                                    resBuf.writeUInt8(0x11, 4); //code do on
                                }
                                resBuf.writeUInt8(0, 6); //m_extra
                            }
                            break;
                        case 20: //down cmd
                            {
                                console.log('down cmd ' + _dev.status_r)
                                if (_dev.status_r == 0) { //활성 상태

                                    resBuf.writeUInt8(0x12, 4); //code off
                                }
                                else { //비 활성 상태
                                    _dev.status_l = 100
                                }
                                resBuf.writeUInt8(0, 6); //m_extra

                            }
                            break;
                        case 100:
                            resBuf.writeUInt8(0, 6); //m_extra
                            break;

                    }

                    resBuf.writeUInt8(_dev.status_l, 5); //m_status


                    server.send(
                        resBuf, 0, resBuf.length,
                        rinfo.port, rinfo.address); // added missing bracket

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
        return deviceList
    }
}

export default udpServer;
