import { existsSync, readFileSync } from 'node:fs';
import { fork } from 'node:child_process';

interface ServiceResponse {
  data: unknown;
  returnCode: number;
}

interface OutboundMessage {
  data: unknown;
  mime: string;
  code: number;
}
const green = '\x1b[32m%s\x1b[0m';
const yellow = '\x1b[33m%s\x1b[0m';
const red = '\x1b[31m%s\x1b[0m';
const cyan = '\x1b[36m%s\x1b[0m';
process.on('message', (message: unknown) => {
  const msg = `${message ?? ''}`;
  if (msg === 'SIGINT') {
    terminate();
  }

  const resource = decodeURIComponent(process.argv[2] ?? '');

  const body = process.argv[3] ?? '';
  const visitorIP = process.argv[4] ?? '';

  const basePath = new URL('.', import.meta.url).pathname;
  const now = new Date();
  const stamp = `${String(now.getFullYear()).slice(-2)}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;

  if (msg === 'GET') {
    if (resource.startsWith('/:')) {
      const pathName = `${basePath}services`;
      const serviceName = resolveServiceName(pathName, resource.substring(2));
      if (serviceName) {
        runService(pathName, serviceName, '', 'GET', stamp, visitorIP);
        console.log(cyan, `${stamp} SRV ${visitorIP} POST ${resource.substring(2)}`);
      } else {
        console.log(red, `${stamp} SRV ${visitorIP} POST ${resource.substring(2)}`);
      }
    } else {
      const pathName = `${basePath}content`;
      getFile(pathName, resource, msg, stamp, visitorIP);
    }
  }

  if (msg === 'POST') {
    if (resource.startsWith('/:')) {
      const pathName = `${basePath}services`;
      const serviceName = resolveServiceName(pathName, resource.substring(2));
      if (serviceName) {

        runService(pathName, serviceName, body, 'POST', stamp, visitorIP);
        console.log(cyan, `${stamp} SRV ${visitorIP} POST ${resource.substring(2)}`);
      } else {
        console.log(red, `${stamp} SRV ${visitorIP} POST ${resource.substring(2)}`);
      }
    }
  }
});

function runService(pathName: string, serviceName: string, body: string, method: string, stamp: string, visitorIP: string): void {
  try {
    if (existsSync(pathName + serviceName)) {
      const serviceWorker = fork(pathName + serviceName);
      if (body !== '') serviceWorker.send?.(`BODY${body}`);
      serviceWorker.send?.('RUN');
      serviceWorker.on('message', (serviceResponse: string) => {
        const sr = JSON.parse(serviceResponse) as ServiceResponse;
        const result: OutboundMessage = {
          data: sr.data,
          mime: 'application/JSON',
          code: sr.returnCode,
        };
        const json = JSON.stringify(result);
        process.send?.(json);
        try {
          process.kill(serviceWorker.pid ?? 0);
          console.log(green, `${stamp} 200 ${visitorIP} ${method} ${serviceName}`);
        } catch (err) {
          console.log(red, `${stamp} SRV ${visitorIP} ${method} ${serviceWorker.pid}`);
        }
      });
    } else {
      throw new Error('Service not Implemented');
    }
  } catch (err) {
    const error = err as Error;
    console.log(yellow, `${stamp} 500 ${visitorIP} ${method} ${serviceName}`);
    const returnData = get500(error.message);
    const result: OutboundMessage = { data: returnData, mime: 'text/html', code: 500 };
    const json = JSON.stringify(result);
    process.send?.(json);
  }
}

function resolveServiceName(pathName: string, serviceId: string): string | null {
  const tsName = `/${serviceId}.ts`;
  if (existsSync(pathName + tsName)) return tsName;

  const jsName = `/${serviceId}.js`;
  if (existsSync(pathName + jsName)) return jsName;

  return null;
}

function getFile(pathName: string, fileName: string, method: string, stamp: string, visitorIP: string): void {
  let returnData = '';
  let returnCode = 200;
  let mimeType = getMimeType(fileName);
  try {
    if (fileName === '/' || fileName === '') {
      fileName = '/347r1x.htm';
      mimeType = 'text/html';
    } else if (fileName.indexOf('ip-api.com') > 0) {
      throw new Error('501');
    } else if (fileName.indexOf('http') > 0) {
      throw new Error('501');
    } else if (fileName.indexOf('login') > 0) {
      throw new Error('501');
    } else if (fileName.indexOf('boaform') > 0) {
      throw new Error('501');
    }
    returnData = readFileSync(pathName + fileName).toString();
    console.log(green, `${stamp} 200 ${visitorIP} ${method} ${fileName}`);
  } catch (err) {
    const error = err as Error;
    let color = red;
    mimeType = 'text/html';
    if (error.message.startsWith('ENOENT')) {
      returnData = get404();
      returnCode = 404;
      color = yellow;
    } else if (error.message = '501') {
      returnData = get501();
      returnCode = 501;
      mimeType = 'text/html';
    } else {
      returnData = get500('');
      returnCode = 500;
    }
    console.log(color, `${stamp} ${returnCode} ${visitorIP} ${method} ${fileName}`);
  }
  const result: OutboundMessage = {
    data: returnData,
    mime: mimeType,
    code: returnCode,
  };
  const json = JSON.stringify(result);
  process.send?.(json);
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

function get404(): string {
  return '<html><head><title>404</title></head><body bgcolor="black"><font size="+2" color="white">404: File Not Found.</font></body></html>';
}

function get500(msg: string): string {
  return `<html><head><title>500</title></head><body bgcolor="black"><font size="+2" color="white">500: Server Error</font></body</html>`;
}
function get501(): string {
  return `<html><head><title>501</title></head><body bgcolor="black"><font size="+2" color="white">501: Not Implemented</font></body</html>`;
}
