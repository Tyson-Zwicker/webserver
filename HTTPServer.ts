import { createServer, IncomingMessage, ServerResponse } from 'node:http';
import { fork } from 'node:child_process';

interface WorkerResponse {
  data: string;
  mime: string;
  code: number;
}
const green = '\x1b[32m%s\x1b[0m';
const yellow = '\x1b[33m%s\x1b[0m';
const red = '\x1b[31m%s\x1b[0m';
const cyan = '\x1b[36m%s\x1b[0m';

let PORT = 2001;
try {
  if (typeof process.argv[2] === 'string') PORT = parseInt(process.argv[2]);
}
catch { ; }

console.log(green, `Listening on port`, cyan, `${PORT}.`);
const server = createServer(listener);
server.listen(PORT);

function listener(req: IncomingMessage, res: ServerResponse): void {
  const forwarded = req.headers['x-forwarded-for'];
  const forwardedFirst = Array.isArray(forwarded) ? forwarded[0] : forwarded;
  const ipCandidate = (forwardedFirst ?? req.socket.remoteAddress ?? '').toString();
  const visitorsIP = ipCandidate.substring(7);

  const now = new Date();
  const stamp = `${String(now.getFullYear()).slice(-2)}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;
  if (req.method === 'POST') {
    let postBody = '';
    req.on('data', (chunk) => {
      postBody += chunk.toString();
    });
    req.on('end', () => {
      invokeWorker(req, res, postBody, visitorsIP, stamp);
    });
  } else {
    invokeWorker(req, res, '', visitorsIP, stamp);
  }
}

function invokeWorker(req: IncomingMessage, res: ServerResponse, body: string, visitorIP: string, stamp: string): void {
  const safeBody = body ?? '';
  const workerVerbosity = '1';
  const workerPath = new URL('./HTTPWorker.ts', import.meta.url).pathname;
  const worker = fork(workerPath, [req.url ?? '', safeBody, visitorIP]);

  worker.send(req.method ?? '');
  worker.on('message', (message: string) => {
    const msg = JSON.parse(message) as WorkerResponse;
    res.setHeader('Content-Type', msg.mime);
    res.writeHead(msg.code);
    res.write(`${msg.data}`);
    res.end();

    try {
      process.kill(worker.pid ?? 0);
    } catch (err) {
      const now = new Date();
      const stamp = `${String(now.getFullYear()).slice(-2)}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;
      console.log(red, `${stamp} SERVER could not kill worker process: ${worker.pid}`);
    }
  });
}
