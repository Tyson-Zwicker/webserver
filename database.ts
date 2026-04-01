//This runs on the server.
import fs, { promises as fsPromises } from 'fs';

namespace db {
  type ReaderQueue = Record<string, Record<number, Promise<string>>>;
  type WriteQueue = Record<string, Record<number, Promise<void>>>;
  // type TableRegistry =Record<string,Record<string,'string'|'number'|'stringArray'|'numberArray'>>;
  //[TableName][property] = 'string','number',etc.... used for serialization...
  type DataBase = {
    nextId: number;
    path: string;
    tables: string[];
    readers: ReaderQueue;
    writers: WriteQueue;
  };
  function getValue<T, Tkey extends keyof T>(obj: T, key: Tkey) {
    return obj[key];
  }
  export function invoke(dbPath: string, tables: string[]): DataBase {
    let path: string = dbPath.endsWith('/') ? dbPath : dbPath + '/'
    return {
      nextId: 0,
      path: path,
      tables: tables,
      readers: {},
      writers: {}
    }
  };
  export function addWriter(dbase: DataBase, filename: string, promise: Promise<void>): number {
    let id = dbase.nextId++;
    if (!dbase.writers[filename]) dbase.writers[filename] = {};
    dbase.writers[filename][id] = promise;
    return id;
  }
  export function addReader(dbase: DataBase, filename: string, promise: Promise<string>): number {
    let id = dbase.nextId++;
    if (!dbase.readers[filename]) dbase.readers[filename] = {};
    dbase.readers[filename][id] = promise;
    return id;
  }
  async function readRecord(filePath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      fs.readFile(filePath, 'utf-8', (error, data) => {
        if (error) reject(error);
        else resolve(data);
      })
    });
  }
  async function writeRecord(filePath: string, json: string): Promise<void> {
    return new Promise((resolve, reject) => {
      fs.writeFile(filePath, json, (error) => {
        if (error) reject(error);
        else resolve();
      });
    });
  }

  export async function getRecordJSON(dbase: DataBase, tableName: string, recordId: number): Promise<string> {
    if (!dbase.tables.includes(tableName)) throw new Error(`db.getRecordJSON: table"${tableName}" is not in the list of known tables.`);
    let readerID = -1;
    let filePath = `${dbase.path}${tableName}/${recordId}`;
    try {
      //Can't read if something is writing to it...
      if (dbase.writers[filePath]) {
        await Promise.all(Object.values(dbase.writers[filePath]));
      }
      let promise = readRecord(filePath);
      readerID = db.addReader(dbase, filePath, promise);
      let json = await promise;
      return json;
    }
    catch (error) {
      throw error;
    }
    finally {
      delete dbase.readers[filePath][readerID];
    }
  }

  export async function setRecordJSON(dbase: DataBase, tableName: string, recordId: number, json: string) {
    if (!dbase.tables.includes(tableName)) throw new Error(`db.getRecordJSON: table"${tableName}" is not in the list of known tables.`);
    let filePath = `${dbase.path}${tableName}/${recordId}`;
    if (dbase.readers[filePath]) {
      await Promise.all(Object.values(dbase.readers[filePath]));
    }
    //No one is try to read anymore.. 
    if (dbase.writers[filePath]) {
      await Promise.all(Object.values(dbase.writers[filePath]));
    }
    let writerId = -1;
    try {
      let promise = writeRecord(filePath, json);
      writerId = db.addWriter(dbase, filePath, promise);
      let success = await promise;
      return success;
    } catch (error) {
      throw error;
    }
    finally {
      delete dbase.writers[filePath][writerId];
    }
  }
  //TODO: Write and Read whole table in one operation.. same locking mechanism should work. or just large batches of id's all at once..

  //TODO: For these to work, the database should now the types of the properties,
  //So the JSON can be made to fit.  It could LEARN that at initialization if provided a type for each table along with the name...
}

//Usage:

let myDB = db.invoke('path', ['table1', 'table2']);
db.getRecordJSON(myDB, 'table1', 1)
  .then((value) => {
    //Now you have to parse the GD thing... but you got it..
  });
