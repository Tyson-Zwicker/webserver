const child_process = require('child_process');
let pid = -1;

process.on('message', (message) => {
    msg = message + '';
    if (msg === 'SIGINT') {
        terminate();
    }
    console.log ('XMLREQUEST RECIEVED: '+msg);
    if (msg.indexOf('PID') === 0) {
        pid = msg.substring(3);
        console.log ('PID SECTION READ AS:['+pid+']');
        returnService ('[Data returned from service]');
    }
});
function returnService(data) {
    let returnCode = 200;
    let result = {
        data: data,
        pid: pid,
        returnCode: returnCode
    };
    process.send(JSON.stringify(result));
}
function terminate() {
    process.exit(0);
}