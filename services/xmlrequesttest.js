const child_process = require('child_process');
let spid = -1;

process.on('message', (message) => {
    msg = message + '';
    if (msg === 'SIGINT') {
        terminate();
    }
    
    if (msg.indexOf('PID') === 0) {
        spid = msg.substring(3);
        console.log ('SERVICE recieved SPID:['+spid+']');
        returnService ('[Data returned from service]');
    }
});
function returnService(data) {
    let returnCode = 200;    
    let result = {
        data: data,
        spid: spid,
        returnCode: returnCode
    };
    process.send(JSON.stringify(result));
}
function terminate() {
    process.exit(0);
}