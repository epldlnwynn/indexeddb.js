
export interface IUpgrade {
    readonly name: string;
    readonly transaction: IDBTransaction;
    create(options?: IDBObjectStoreParameters): IUpgrade;
    delete(): void;
    index(name: string): IDBIndex;
    createIndex(name: string, keyPath: string | string[], options?: IDBIndexParameters): IDBIndex;
    deleteIndex(name:  string): IUpgrade;
}

export interface ITable {
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
    pages(query: IDBValidKey | IDBKeyRange | null, direction: IDBCursorDirection, page: number, size?: number | 10, call?: (data: Array<any>) => void): void;
}

export interface IDatabase {
    name: string;
    version: number;

    open(upgradeCall?: (table: (name: string) => IUpgrade) => void): IDatabase;

    table(name: string): ITable;

    delete(): IDBOpenDBRequest;

    close(): void;
}

class UpgradeImpl implements IUpgrade {
    transaction: IDBTransaction;
    name: string;
    protected _os: any;

    constructor(name: string, transaction: IDBTransaction) {
        this.transaction = transaction;
        this.name = name;
    }


    create(options?: IDBObjectStoreParameters) {
        if (!this.transaction.objectStoreNames.contains(this.name)) {
            this._os = this.transaction.db.createObjectStore(this.name, options)
        }
        return this as any;
    }
    delete() {
        this.transaction.db.deleteObjectStore(this.name)
    }
    index(name: string) {
        return this._os.index(name)
    }
    createIndex(name: string, keyPath: string | string[], options?: IDBIndexParameters) {
        if (this._os.indexNames.contains(name))
            return this.index(name);

        return this._os.createIndex(name, keyPath, options)
    }
    deleteIndex(name: string) {
        this._os.deleteIndex(name)
        return this as any;
    }
};

class TableImpl implements ITable {
    readonly db: IDBDatabase;
    names: Array<string>;
    constructor(db: IDBDatabase, ...name: string[]) {
        this.names = [].concat(name as any);
        this.db = db;
    }


    protected get _rw(): any {
        return this.db.transaction(this.names, 'readwrite').objectStore(this.names[0])
    }
    protected get _r(){
        return this.db.transaction(this.names, 'readonly').objectStore(this.names[0])
    }


    get indexNames(){ return this._r.indexNames }
    get keyPath(){ return this._r.keyPath }

    add(data: any, validKey: IDBValidKey) { return this._rw.add(data, validKey) }
    put(data: any, validKey: IDBValidKey) { return this._rw.put(data, validKey) }
    delete(query: IDBValidKey | IDBKeyRange) { return this._rw.delete(query) }
    clear() {return this._rw.clear()}


    index(name: string) { return this._r.index(name) }


    count(query: IDBValidKey | IDBKeyRange) {return this._r.count(query)}
    get(query: IDBValidKey | IDBKeyRange) { return this._r.get(query) }
    getKey(query: IDBValidKey | IDBKeyRange) { return this._r.getKey(query) }
    getAll(query: IDBValidKey | IDBKeyRange | null, count?: number) { return this._r.getAll(query, count) }
    getAllKeys(query: IDBValidKey | IDBKeyRange | null, count?: number) { return this._r.getAllKeys(query, count) }
    openCursor(query: IDBValidKey | IDBKeyRange | null, direction?: IDBCursorDirection) { return this._r.openCursor(query, direction) }
    pages(query: IDBValidKey | IDBKeyRange | null, direction: IDBCursorDirection, page: number, size?: number, call?: any) {
        size = size || 10, call = call || console.log;

        const req = this.openCursor(query, direction),
            data:Array<any> = [],
            p = (page || 1) - 1,
            offset = p * size;
        let first = true, index = 0;
        req.onsuccess = ev => {
            // @ts-ignore
            const res = ev.target?.result;
            if (res) {
                if (first && offset > 0) {
                    index = 0, first = false, res.advance(offset);
                    return;
                }

                ++index;
                data.push(res.value);

                if (index === size) {
                } else {
                    res.continue();
                    return;
                }
            }
            call && call(data, page, size)
        };
        req.onerror = ev => console.log('pages.error', ev)

    }
};

class DatabaseImpl implements IDatabase {
    name;
    version;
    // @ts-ignore
    #conn;
    constructor(name: string, version: number) {
        this.name = name;
        this.version = version;
    }

    open(upgradeCall?: (table: (name: string) => IUpgrade) => void) {
        if (this.#conn && this.#conn.result.readyState === "done")
            return this;

        const dbConn = indexedDB.open(this.name, this.version)
        dbConn.onsuccess = ev => {console.log('open success.', new Date().toLocaleTimeString())};
        dbConn.onerror = ev => console.log("onerror", ev);
        if (upgradeCall) {
            dbConn.onupgradeneeded = ev => {
                console.log('onupgradeneeded', ev.target)
                upgradeCall(function (name: string) {
                    console.log('table', name)
                    const t = ev.target as any;
                    return new UpgradeImpl(name, t.transaction)
                })
            };
        };
        this.#conn = dbConn

        return this
    }

    table(name: string) {
        if (!this.#conn) throw Error("Please open the database.")
        return new TableImpl(this.#conn.result, name);
    }

    delete() { return indexedDB.deleteDatabase(this.name) }
    close(){this.#conn && this.#conn.result && this.#conn.result.close(), this.#conn = undefined}
};

const IndexedDBUtil = {
    databases(name: string, version = 1): IDatabase {
        return new DatabaseImpl(name, version);
    }
};

const win = window as any
win.indexedDBUtil = IndexedDBUtil;

export default IndexedDBUtil;
