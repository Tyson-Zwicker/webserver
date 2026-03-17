process.on('message', (message) => {
    let msg = message + '';
    if (msg === 'SIGINT') {
        terminate();
    }
    
    if (msg.indexOf('RUN') === 0) {        
        returnService ('[Data returned from service]');
    }
});
function returnService(data) {
    let returnCode = 200;    
    let result = {
        data: data,
        returnCode: returnCode
    };
    process.send(JSON.stringify(result));
}
function terminate() {
    process.exit(0);
}