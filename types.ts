
export interface WorkerResponse {
  data: string;
  mime: string;
  code: number;
}
export interface ServiceResponse {
  data: string;
  returnCode: number;
}
export interface ServiceData {
  type: 'body' | 'parameters';
  data: string | Parameters;
}
export interface ServiceResult {
  data: string;
  returnCode: number;
}
export type Parameters = Record <string,string>;
