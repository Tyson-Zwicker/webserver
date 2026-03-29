import type {Parameters} from './types.ts';

export namespace Util {
  export function getParameters(uri: string): Parameters {
    const paramsStart = uri.indexOf('?');
    if (paramsStart === -1) return {} as Parameters;

    const query = uri.substring(paramsStart + 1);
    if (!query) return {};

    const decode = (value: string): string => {
      try {
        return decodeURIComponent(value.replace(/\+/g, ' ')); //Replace + with space.. 
      } catch {
        return value;
      }
    };

    return query.split('&').reduce((acc, pair) => {
      if (!pair) return acc;
      const [rawKey, rawValue = ''] = pair.split('=', 2);
      if (!rawKey) return acc;
      const key = decode(rawKey);
      const value = decode(rawValue);
      acc[key] = value;
      return acc;
    }, {} as Parameters);
  }
  export function stripParameters(uri: string) {
    if (uri.indexOf('?') === -1) {
      return uri;
    } else {
      return uri.substring(0, uri.indexOf('?'));
    }
  }
}