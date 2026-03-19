
let postBody = '';
process.on('message', (message) => {
    let msg = message + '';
    if (msg === 'SIGINT') {
        terminate();
    }
    
    if (msg.indexOf('RUN') === 0) {
        returnService ('[Data returned from service]['+postBody+']');
    }
    if (msg.indexOf('BODY') ===0){
      postBody= msg.substring(4);      
    }
});
function returnService(data) {
    let returnCode = 200;    
    let result = {
        data: getData(),
        returnCode: returnCode
    };
    process.send(JSON.stringify(result));
}
function terminate() {
    process.exit(0);
}

function getData (){
  return 'GEOSERVER';
}