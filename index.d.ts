// LICENSE is MIT
//
// Copyright (c) 2018
//


interface IUpgrade {
    readonly name: string;
    readonly transaction: IDBTransaction;
    create(options?: IDBObjectStoreParameters): IUpgrade;
    delete(): void;
    index(name: string): IDBIndex;
    createIndex(name: string, keyPath: string | string[], options?: IDBIndexParameters): IDBIndex;
    deleteIndex(name:  string): IUpgrade;
}

interface ITable {
    readonly db: IDBDatabase;
    readonly names: Array<string>;
    readonly keyPath: string | string[];
    readonly indexNames: DOMStringList;


    add(data: any, validKey?: IDBValidKey): IDBRequest;
    put(data: any, validKey?: IDBValidKey): IDBRequest;
    delete(query: IDBValidKey | IDBKeyRange): IDBRequest;
    clear(): IDBRequest;


    index(name: string): IDBIndex;


    count(query: IDBValidKey | IDBKeyRange): IDBRequest<number>;
    get(query: IDBValidKey | IDBKeyRange): IDBRequest<any>;
    getKey(query: IDBValidKey | IDBKeyRange): IDBRequest<IDBValidKey | undefined>;
    getAll(query: IDBValidKey | IDBKeyRange | null, count?: number): IDBRequest<any[]>;
    getAllKeys(query: IDBValidKey | IDBKeyRange | null, count?: number): IDBRequest<IDBValidKey[]>;
    openCursor(query: IDBValidKey | IDBKeyRange | null, direction?: IDBCursorDirection): IDBRequest<IDBCursorWithValue | null>;
    pages(query: IDBValidKey | IDBKeyRange | null, page: number, size?: number | 10, call?: void): void;
}

interface IDatabase {
    name: string;
    version: number;

    init(upgradeCall: (table: (name: string) => IUpgrade) => void, newVersion?: number | 0): void;

    open(): IDatabase;

    table(name: string): ITable;

    delete(): IDBOpenDBRequest;

    close(): void;
}
