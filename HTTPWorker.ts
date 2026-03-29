import { existsSync, readFileSync } from 'node:fs';
import { resolve, sep } from 'node:path';
import { fork } from 'node:child_process';
import type { ServiceResponse, ServiceData, WorkerResponse } from './types.ts';
import { Util } from './utils.js';
import { log } from './logger.js';

const green = '\x1b[32m%s\x1b[0m';
const yellow = '\x1b[33m%s\x1b[0m';
const red = '\x1b[31m%s\x1b[0m';
const cyan = '\x1b[36m%s\x1b[0m';


process.on('message', (message: unknown) => {
  const resource = process.argv[2] ?? '';
  const body = process.argv[3] ?? '';
  const visitorIP = process.argv[4] ?? '';
  const basePath = new URL('.', import.meta.url).pathname;
  const now = new Date();
  const stamp = `${String(now.getFullYear()).slice(-2)}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;

  const msg = `${message ?? ''}`;
  if (msg === 'SIGINT') terminate();
  if (msg === 'GET') {
    if (resource.startsWith('/:')) {
      let serviceData = { 'type': 'parameters', 'data': Util.getParameters(resource) } as ServiceData;
      runService(basePath, resource, serviceData, 'GET', stamp, visitorIP);
    } else {
      if (resource === '/console' || resource === '/login') {
        returnFile(`${basePath}auth`, `${resource}.html`, 'GET', stamp, visitorIP);
      } else if (resource.startsWith('/cgi-bin/luci/')){
        log(red, `${stamp} 302 ${visitorIP} ${msg} ${Util.stripParameters(resource)}`);
        send ({data:'', mime:'text/text', code:302} as WorkerResponse);
      } else {
        returnFile(`${basePath}content`, Util.stripParameters(resource), msg, stamp, visitorIP);
      }
    }
  }
  else if (msg === 'POST') {
    if (resource.startsWith('/:')) {
      let serviceData = { 'type': 'body', 'data': body } as ServiceData;
      runService(basePath, resource, serviceData, 'POST', stamp, visitorIP);
    } else {
      send({ data: '', mime: 'text/html', code: 302 });
    }
  } else {//We only do POST and GET here, so this is not implemented.    
    log(red, `${stamp} ${501} ${visitorIP} ${msg} ${resource}`);
    send({ data: get501(), mime: 'text/html', code: 501 });
  }
});

function runService(basePath: string, resource: string, data: ServiceData, method: string, stamp: string, visitorIP: string): void {
  const pathName = `${basePath}services`;
  const serviceName = resolveServiceName(pathName, Util.stripParameters(resource).substring(2));
  try {
    if (serviceName !== null && existsSync(pathName + serviceName)) {
      const serviceWorker = fork(pathName + serviceName);
      serviceWorker.send?.(data);
      serviceWorker.send?.('RUN');
      serviceWorker.on('message', (srvResponse: string) => {
        const serviceResponse = (JSON.parse(srvResponse) as ServiceResponse);
        const result: WorkerResponse = {
          data: serviceResponse.data,
          mime: 'application/JSON',
          code: serviceResponse.returnCode,
        };
        send(result);
        try {
          process.kill(serviceWorker.pid ?? 0);
          log(cyan, `${stamp} 200 ${visitorIP} ${method} ${serviceName.substring(0, serviceName.length)}`);
        } catch (err) {
          log(red, `${stamp} SRV ${visitorIP} ${method} ${serviceWorker.pid}`);
        }
      });
    } else {
      log(red, `${stamp} SRV ${visitorIP} GET ${Util.stripParameters(resource)}`);
      send({ data: get404(), mime: 'text/html', code: 404 });
    }
  } catch (err) {
    log(red, `${stamp} 500 ${visitorIP} ${method} ${Util.stripParameters(resource)}`);
    send({ data: get500((err as Error).message), mime: 'text/html', code: 500 });
  }
}

function resolveServiceName(pathName: string, serviceId: string): string | null {
  const tsName = `/${serviceId}.ts`;
  if (existsSync(pathName + tsName)) return tsName;
  const jsName = `/${serviceId}.js`;
  if (existsSync(pathName + jsName)) return jsName;
  return null;
}

function returnFile(pathName: string, fileName: string, method: string, stamp: string, visitorIP: string): void {
  let returnData = '';
  let returnCode = 200;
  let mimeType = getMimeType(fileName);
  const safePath = resolveSafePath(pathName, fileName);
  if (safePath === null) {
    log(red, `${stamp} 403 ${visitorIP} ${method} ${fileName}`);
    send({ data: get403(), mime: 'text/html', code: 403 });
    return;
  }
  try {
    if (fileName === '/' || fileName === '') { //handle empty request with 'welcome screen';
      fileName = '/347r1x.htm';
      mimeType = 'text/html';
    }
    returnData = readFileSync(safePath).toString();
    log(green, `${stamp} 200 ${visitorIP} ${method} ${fileName}`);
  } catch (err) {
    let color = red;
    mimeType = 'text/html';
    if ((err as Error).message.startsWith('ENOENT')) {
      returnData = get404();
      returnCode = 404;
      color = yellow;
    } else {
      returnData = get500('');
      returnCode = 500;
    }
    log(color, `${stamp} ${returnCode} ${visitorIP} ${method} ${fileName}`);
  }
  const result: WorkerResponse = {
    data: returnData,
    mime: mimeType,
    code: returnCode,
  };
  send(result);
}

function resolveSafePath(baseDir: string, fileName: string): string | null {
  const normalizedBase = resolve(baseDir);
  const relativeName = fileName.startsWith('/') ? fileName.slice(1) : fileName;
  const targetPath = resolve(normalizedBase, relativeName);
  if (targetPath === normalizedBase) return targetPath;
  return targetPath.startsWith(normalizedBase + sep) ? targetPath : null;
}

function send(response: WorkerResponse) {
  process.send?.(JSON.stringify(response));
}
function get404(): string {
  return '<html><head><title>404</title></head><body bgcolor="black"><font size="+2" color="white">404: File Not Found.</font></body></html>';
}
function get403(): string {
  return `<html><head><title>403</title></head><body bgcolor="black"><font size="+2" color="white">403: Forbidden</font></body</html>`;
}
function get500(msg: string): string {
  return `<html><head><title>500</title></head><body bgcolor="black"><font size="+2" color="white">500: Server Error</font></body</html>`;
}
function get501(): string {
  return `<html><head><title>501</title></head><body bgcolor="black"><font size="+2" color="white">501: Not Implemented</font></body</html>`;
}
function terminate(): void {
  process.exit(0);
}

function getMimeType(url: string): string {
  const lastindex = url.lastIndexOf('.') + 1;
  const extension = url.substring(lastindex, url.length);
  if (extension === '7zip' || extension === '.zip') return 'application/x-7z-compressed';
  if (extension === 'txt') return 'text/text';
  if (extension === 'css') return 'text/css';
  if (extension === 'htm') return 'text/html';
  if (extension === 'html') return 'text/html';
  if (extension === 'csv') return 'text/csv';
  if (extension === 'jpg') return 'image/jpeg';
  if (extension === 'png') return 'image/png';
  if (extension === 'ico') return 'image/x-icon';
  if (extension === 'bmp') return 'image/bmp';
  if (extension === 'oga') return 'audio/ogg';
  if (extension === 'mp3') return 'audio/mp3';
  if (extension === 'pdf') return 'application/pdf';
  if (extension === 'jpeg') return 'image/jpeg';
  if (extension === 'json') return 'application/json';
  if (extension === 'js' || extension === '.mjs ') return 'text/javascript';
  return 'application/octet-stream';
}