const child_process = require('child_process');
let pid = -1;

process.on('message', (message) => {
    msg = message + '';
    if (msg === 'SIGINT') {
        terminate();
    }

    if (msg.indexOf('PID') === 0) {
        pid = msg.substring(msg.substring(3));
        returnService ('[Data returned from service]');
    }
});
function returnService(data) {
    let returnCode = 200;
    let result = {
        data: data,
        pid: pid
    };
    process.send(JSON.stringify(result));
}
function terminate() {
    process.exit(0);
}