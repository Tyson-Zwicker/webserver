const http = require('http');
const child_process = require('child_process');
const port = 8080;
const server = http.createServer(listener);
server.listen(port);
let verbose = 0;
if (process.argv.length === 3) {
  if (process.argv[2].startsWith('-v')) {
    verbose = 1;
    console.log('Listening.');
  }
}
function listener(req, res) {
  let visitorsIP = ((req.headers['x-forwarded-for']?.split(',')[0].trim()) || req.socket.remoteAddress).substring(7);
  if (verbose) {    
    const now = new Date();
    const stamp = `${String(now.getFullYear()).slice(-2)}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;
    console.log(stamp + ' ' + visitorsIP + ' '+req.method+' ' + req.url);
  }
  if (req.method === 'GET') {
    invokeWorker(req, res, '',visitorsIP);
  }
  if (req.method === 'POST') {
    let postBody = '';
    // Listen for data chunks
    req.on('data', (chunk) => {
      postBody += chunk.toString(); // Convert Buffer to string
    });

    // Listen for the end of the request body
    req.on('end', () => {
      invokeWorker(req, res, postBody, visitorsIP);
    });
  }
}
function invokeWorker(req, res, body, visitorIP) {
  if (!body) body = '';
  let workerVerbosity = '1';
  var worker = child_process.fork(__dirname + '/HTTPWorker.js', [req.url, workerVerbosity, body, visitorIP]);
  worker.send(req.method);
  worker.on('message',
    (message) => {
      let msg = JSON.parse(message);
      res.setHeader('Content-Type', msg.mime);
      res.writeHead(msg.code);
      res.write(msg.data + '');
      res.end();

      try {
        process.kill(parseInt(worker.pid));
      } catch (err) { console.log('SERVER could not kill worker process: ' + worker.pid); }
    }
  );
}