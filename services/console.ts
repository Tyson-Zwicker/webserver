import type { Parameters, ServiceData, ServiceResult } from '../types.js';
import { log } from '../logger.js';

function isServiceData(value: unknown): value is ServiceData {
  return (typeof value === "object" && value !== null && 'type' in value && 'data' in value);
}
let body: string = '';
let prams: Parameters = {} as Parameters;

process.on('message', (message: unknown) => {
  if (isServiceData(message)) {
    if (message.type === 'body') body = message.data as string;
    else if (message.type === 'parameters') prams = message.data as Parameters;
    else throw new Error('service received unknown message' + message);
  } else {
    const msg = `${message ?? ''}`;
    if (msg === 'SIGINT') {
      terminate();
      return;
    }

    /// ----------------- 
    if (msg.startsWith('RUN')) {
      if (prams.usr && prams.pwd) {
        returnService('Authorization Failed. Code: 0.100');
      } else if (prams.usr) {
        returnService('Enter Password:');
      } else {        
        returnService(JSON.stringify(prams));
      }
    }
    /// ----------------
  }
});

function returnService(data: string): void {
  const result: ServiceResult = {
    data,
    returnCode: 200,
  };
  process.send?.(JSON.stringify(result));
}

function terminate(): never {
  process.exit(0);
}