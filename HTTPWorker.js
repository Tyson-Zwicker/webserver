const fs = require('fs');
const child_process = require('child_process');
let pid = -1;
let verbose = 0;
process.on('message', (message) => {
  let msg = message + '';
  if (msg === 'SIGINT') {
    if (verbose==1) console.log('TERMINATE||' + pid);
    terminate();
  }
  let resource = process.argv[2];
  let verbose = parseInt(process.argv[3]);
  let body = process.argv[4];

  if (msg === 'GET') {
    if (resource.startsWith('/:')) {
      let pathName = process.argv[1].substring(0, process.argv[1].lastIndexOf('/')) + '/services';
      let serviceName = '/' + resource.substring(2) + '.js';
      if (verbose == 1) console.log(msg + '||<service>||' + pathName + '||' + serviceName);
      runService(pathName, serviceName);
    } else {
      let pathName = process.argv[1].substring(0, process.argv[1].lastIndexOf('/')) + '/content';
      if (verbose == 1) console.log(msg + '||' + pathName + '||' + resource);
      getFile(pathName, resource);
    }
  }
  if (msg === 'POST') {
    if (resource.startsWith('/:')) {
      let pathName = process.argv[1].substring(0, process.argv[1].lastIndexOf('/')) + '/services';
      let serviceName = '/' + resource.substring(2) + '.js';
      if (verbose == 1) console.log(msg + '||<service>||' + pathName + '||' + serviceName);
      runService(pathName, serviceName, body);
    }
  }
  if (msg.indexOf('PID') === 0) {    
    pid = msg.substring(3);
    if (verbose == 1) console.log('PID #' + pid);
  }
});

function runService(pathName, serviceName, body) {
  let returnData;
  let returnCode = 200;
  try {
    if (fs.existsSync(pathName + serviceName)) {
      if (verbose == 1) console.log('SERVICE||' + pathName + '||' + serviceName + '||' + serviceName.url);
      var serviceWorker = child_process.fork(pathName + serviceName, [serviceName.url]);
      if (body) serviceWorker.send("BODY" + body);
      serviceWorker.send("PID" + serviceWorker.pid);
      serviceWorker.on('message', (serviceResponse) => {
        let sr = JSON.parse(serviceResponse);
        let result = {
          "data": sr.data,
          "mime": 'application/JSON',
          "code": sr.returnCode,
          "pid": sr.pid
        };
        let json = JSON.stringify(result);
        process.send(json);        
        try{          
          process.kill(parseInt(serviceWorker.pid)); //Make sure the process is dead.
        }
        catch (err){console.log ('WORKER could not kill service process '+sr.spid);} //Process was already dead.
      });
    } else {
      if (verbose == 1) console.log('Service Error (404)||' + serviceName);
      returnData = get404();
      returnCode = 404;
      mimeType = 'text/html';
    }
  } catch (err) {
    if (verbose == 1) console.log('Service Error (500)||' + err.message);
    returnData = get500(err);
    returnCode = 500;
    mimeType = 'text/html';
  }
}
function getFile(pathName, fileName) {
  let returnData = '';
  let returnCode = 200;
  let mimeType = getMimeType(fileName);
  try {
    returnData = fs.readFileSync(pathName + fileName).toString();
    if (verbose == 1) console.log('200');
  } catch (err) {
    if (err.message.startsWith('ENOENT')) {
      if (verbose == 1) console.log('404||' + pathName + '||' + fileName);
      returnData = get404();
      returnCode = 404;
      mimeType = 'text/html';
    } else {
      if (verbose == 1) console.log('500||' + pathName + '||' + fileName + '||' + err.message);
      returnData = get500(err);
      returnCode = 500;
      mimeType = 'text/html';
    }
  }
  let result = {
    "data": returnData,
    "mime": mimeType,
    "code": returnCode,
    "pid": pid
  };
  let json = JSON.stringify(result);
  process.send(json);
}
function terminate() {
  process.exit(0);
}
function getMimeType(url) {
  let lastindex = url.lastIndexOf('.') + 1;
  let extension = url.substring(lastindex, url.length);
  if (extension == '7zip' || extension == '.zip') return 'application/x-7z-compressed';
  if (extension == 'txt') return 'text/text'
  if (extension == 'css') return 'text/css';
  if (extension == 'htm') return 'text/html';
  if (extension == 'html') return 'text/html';
  if (extension == 'csv') return 'text/csv';
  if (extension == 'jpg') return 'image/jpeg';
  if (extension == 'png') return 'image/png';
  if (extension == 'ico') return 'image/x-icon';
  if (extension == 'bmp') return 'image/bmp';
  if (extension == 'oga') return 'audio/ogg';
  if (extension == 'mp3') return 'audio/mp3';
  if (extension == 'pdf') return 'application/pdf';
  if (extension == 'jpeg') return 'image/jpeg';
  if (extension == 'json') return 'application/json';
  if (extension == 'js' || extension == '.mjs ') return 'text/javascript';
  return 'application/octet-stream'; //send anything else as just.. binary.
}
function get404() {
  return '<html><head><title>404</title></head><body><font size="+4">404: File Not Found.</font></body></html>';
}
function get500(err) {
  return '<html><head><title>500</title></head><body><font size="+4">500:' + err.message + '</font></body</html>';
}