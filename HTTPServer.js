const http = require('http');
const child_process = require('child_process');
const port = 2001;
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
  if (verbose) console.log(req.url)
  if (req.method === 'GET') {
    invokeWorker (
  }
  if (req.method === 'POST') {
    let body = '';

    // Listen for data chunks
    req.on('data', (chunk) => {
      body += chunk.toString(); // Convert Buffer to string
    });

    // Listen for the end of the request body
    req.on('end', () => {
      console.log('Received POST body:', body);
    });
  }
}
function invokeWorker() {
  var worker = child_process.fork(__dirname + '/HTTPWorker.js', [req.url, verbose]);
  console.log('sending worker pid:' + worker.pid);
  worker.send("PID" + worker.pid);
  worker.send(req.method);
  worker.on('message',
    (message) => {
      let msg = JSON.parse(message);
      res.setHeader('Content-Type', msg.mime);
      res.writeHead(msg.code);
      res.write(msg.data + '');
      res.end();
      process.kill(parseInt(msg.pid));
    }
  );
}