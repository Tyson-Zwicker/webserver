import { appendFileSync } from 'node:fs';
import { resolve } from 'node:path';

const logFile = resolve(new URL('.', import.meta.url).pathname, 'server.logs');

function stringify(value: unknown): string {
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

export function log(...args: unknown[]): void {
  console.log(...args);
  const line = args.slice (1).map(stringify).join(' ') + '\n';
  try {
    appendFileSync(logFile, line);
  } catch {
    // ignore logging failures
  }
}
