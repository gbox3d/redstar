const socket = io();

globalThis.theApp = {
    socket: socket,
}

theApp.test = {
}


async function main() {

    theApp.deviceListUI = document.querySelector("#deviceListUI")
    theApp.socketStatus = document.querySelector('#socketStatus')
    theApp.deviceId = document.querySelector('#deviceID')

    theApp.controlUI = document.querySelector('#controlUI')
    theApp.waitUI = document.querySelector('#waitUI')

    ////////////////////////////////////////////////////////////////////////////////
    // client-side

    function updateDeviceList(list) {

        let _ul = theApp.deviceListUI.querySelector('ul')
        _ul.innerHTML = ''

        for (const [key, value] of Object.entries(list)) {
            let _li = document.createElement('li')
            _li.innerText = `${key} , ${value.dev_type} , ${value.last_address} , ${value.last_port} ,${value.latency}`
            _li.dataset.devId = key
            _ul.appendChild(_li)
        }


    }


    socket.on("connect", () => {
        console.log("connected");
        theApp.socketStatus.innerText = 'connected'

        socket.emit('getDeviceList', (playload) => {
            console.log(playload)
            updateDeviceList(playload.devList)
        });
    });

    socket.on("disconnect", () => {
        // console.log(socket.id); // undefined
    });

    //////////////
    ///
    document.querySelector('#btnOn').addEventListener('click', async () => {
        theApp.controlUI.hidden = true
        theApp.waitUI.hidden = false

        await new Promise((resolve, reject) => {
            socket.emit('nutRelay', {
                cmd: 'on',
                devId: theApp.deviceId.value
            }, (chipId) => {
                console.log(chipId)
                resolve()
            });
        });

        theApp.controlUI.hidden = false
        theApp.waitUI.hidden = true
    })
    document.querySelector('#btnOff').addEventListener('click', async () => {

        theApp.controlUI.hidden = true
        theApp.waitUI.hidden = false

        await new Promise((resolve, reject) => {
            socket.emit('nutRelay', {
                cmd: 'off',
                devId: theApp.deviceId.value
            }, (chipId) => {
                console.log(chipId)
                resolve();
            })
        });

        theApp.controlUI.hidden = false
        theApp.waitUI.hidden = true


    })

    theApp.waitUI.querySelector('#cancel').addEventListener('click', () => {
        theApp.controlUI.hidden = false
        theApp.waitUI.hidden = true

    })

    theApp.deviceListUI.querySelector('ul').addEventListener('click', (e) => {
        console.log(e)
        if (e.target.tagName == 'LI') {
            let _devId = e.target.dataset.devId
            theApp.deviceId.value = _devId
        }
    })


}

export default main; 