import { createServer, IncomingMessage, ServerResponse } from 'node:http';
import { fork } from 'node:child_process';
import type { WorkerResponse } from './types.ts';
import { log } from './logger.js';
const green = '\x1b[32m%s\x1b[0m';
const yellow = '\x1b[33m%s\x1b[0m';
const red = '\x1b[31m%s\x1b[0m';
const cyan = '\x1b[36m%s\x1b[0m';
const magenta = '\x1b[36m%s\x1b[0m';
let PORT = 2001;
try {
  if (typeof process.argv[2] === 'string') PORT = parseInt(process.argv[2]);
}
catch { ; }
const server = createServer(listener);
server.listen(PORT);
log(cyan, `Listening on port`, yellow, `${PORT}.`);

function listener(req: IncomingMessage, res: ServerResponse): void {
  const forwarded = req.headers['x-forwarded-for'];
  const forwardedFirst = Array.isArray(forwarded) ? forwarded[0] : forwarded;
  const ipCandidate = (forwardedFirst ?? req.socket.remoteAddress ?? '').toString();
  const visitorsIP = ipCandidate.substring(7);

  const decodedUrl = decodeUrl(req.url);
  if (decodedUrl === null) {
    res.writeHead(400);
    res.end('Bad Request');
    return;
  }

  if (req.method === 'POST') {
    let postBody = '';
    req.on('data', (chunk) => { postBody += chunk.toString(); });
    req.on('end', () => { invokeWorker(req, res, decodedUrl, postBody, visitorsIP); });
  } else {
    invokeWorker(req, res, decodedUrl, '', visitorsIP);
  }
}

function invokeWorker(req: IncomingMessage, res: ServerResponse, resource: string, body: string, visitorIP: string): void {
  const safeBody = body ?? '';
  const workerVerbosity = '1';
  const now = new Date();
  const stamp = `${String(now.getFullYear()).slice(-2)}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;
        
  const workerPath = new URL('./HTTPWorker.ts', import.meta.url).pathname;
  try {
    const worker = fork(workerPath, [resource, safeBody, visitorIP]);
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
        log(red, `${stamp} SERVER could not kill worker process: ${worker.pid}`);
      }
    });
  } catch (err) {
    res.writeHead(400);
    res.end('Bad Request');
    log(red, `${stamp} 400 ${visitorIP} ${req.method??'???'} ${resource}`);
    log(magenta,'_WORKER=['+workerPath+']');
    log(magenta,'resource=['+resource+']');
    log(magenta,'safebody=['+safeBody+']');
  }
}

function decodeUrl(rawUrl: string | undefined): string | null {
  if (typeof rawUrl !== 'string') return '';
  try {
    return decodeURIComponent(rawUrl);
  } catch {
    return null;
  }
}