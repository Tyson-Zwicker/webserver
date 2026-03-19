const fs = require('fs');
const child_process = require('child_process');

let verbose = 0;
process.on('message', (message) => {
  let msg = message + '';
  if (msg === 'SIGINT') {
    terminate();
  }
  let resource = process.argv[2];
  verbose = parseInt(process.argv[3]);
  let body = process.argv[4];
  let visitorIP = process.argv[5];

  let fullPath = process.argv[1].substring(0, process.argv[1].lastIndexOf('/'));
  let startPath = process.argv[1].substring (0, process.argv[1].indexOf('/'));
  console.log('DEBUG FULL Path: ' + fullPath);
  console.log('DEBUG START Path: '+ startPath);
  console.log('DEBUG Natural Resource: ' + resource);

  if (msg === 'GET') {
    if (resource.startsWith('/:')) {
      let pathName = fullPath + '/services';
      let serviceName = '/' + resource.substring(2) + '.js';
      if (verbose == 1) console.log('service-> ' + serviceName);
      runService(pathName, serviceName, 'GET');
    } else {
      //--------------                        Special cases...                        ---This is where I fuck around with "hackers"..
      if (fullPath === '/') {
        getIndexPage();
      }
      //TODO: Review logs, and make a put all the script kiddies something do based on the startpath/resource they ask for...

     /* else if (naturalPathName.startsWith === '/login') {
        //Run a service for those who wish to login.
        let serviceName = '/login.js';
        if (verbose == 1) console.log('*service-> ' + serviceName);
        runService(pathName, serviceName, body, 'POST');
      }
      else if (naturalPathName.startsWith === '/geoserver') {

      }
      */

      else {
        //Get the requested file.. if it exists...
        let pathName = fullPath + '/content';
        getFile(pathName, resource);
      }
    }
  }
  if (msg === 'POST') {
    if (resource.startsWith('/:')) {
      let pathName = fullPath + '/services';
      let serviceName = '/' + resource.substring(2) + '.js';
      if (verbose == 1) console.log('service-> ' + serviceName);
      runService(pathName, serviceName, body, 'POST');
    }
  }
});

function runService(pathName, serviceName, body) {

  try {
    if (fs.existsSync(pathName + serviceName)) {
      var serviceWorker = child_process.fork(pathName + serviceName);
      if (body) serviceWorker.send("BODY" + body);
      serviceWorker.send("RUN");
      serviceWorker.on('message', (serviceResponse) => {
        let sr = JSON.parse(serviceResponse);
        let result = {
          "data": sr.data,
          "mime": 'application/JSON',
          "code": sr.returnCode,
        };
        let json = JSON.stringify(result);
        process.send(json);
        try {
          process.kill(parseInt(serviceWorker.pid)); //Make sure the process is dead.
        }
        catch (err) { console.log('WORKER could not kill service process ' + serviceWorker.pid); } //Process was already dead.
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
    if (fileName === '/' || fileName === '') {
      fileName = '/347r1x.htm';
      mimeType = 'text/html';
    }
    returnData = fs.readFileSync(pathName + fileName).toString();
  } catch (err) {
    if (err.message.startsWith('ENOENT')) {
      if (verbose == 1) console.log('404 ' + fileName);
      returnData = get404();
      returnCode = 404;
      mimeType = 'text/html';
    } else {
      if (verbose == 1) console.log('500' + pathName + fileName + '[' + err.message + ']');
      returnData = get500(err);
      returnCode = 500;
      mimeType = 'text/html';
    }
  }
  let result = {
    "data": returnData,
    "mime": mimeType,
    "code": returnCode,
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
  return '<html><head><title>404</title></head><body><font size="+2">404: File Not Found.</font></body></html>';
}
function get500(err) {
  return '<html><head><title>500</title></head><body><font size="+2">500:' + err.message + '</font></body</html>';
}