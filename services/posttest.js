const child_process = require('child_process');
let spid = -1;
let postBody = '';
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
    if (msg.indexOf('BODY') ===0){
      postBody= msg.substring(4);      
    }
});
function returnService(data) {
    let returnCode = 200;    
    let result = {
        data: data,
        pid: spid,
        returnCode: returnCode
    };
    process.send(JSON.stringify(result));
}
function terminate() {
    process.exit(0);
}