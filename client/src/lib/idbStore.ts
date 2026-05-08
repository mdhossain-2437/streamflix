// Minimal IndexedDB wrapper. We avoid adding a dep (idb / dexie) for a
// 4-store schema. Each store is keyed by string and maps to JSON-serialisable
// values OR raw Uint8Array (for download chunks).

const DB_NAME = "streamflix";
const DB_VERSION = 2;

const STORES = ["downloads", "downloadChunks", "myLibrary", "kv"] as const;
export type StoreName = (typeof STORES)[number];

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      for (const name of STORES) {
        if (!db.objectStoreNames.contains(name)) {
          db.createObjectStore(name);
        }
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
    req.onblocked = () => reject(new Error("IndexedDB blocked"));
  }).catch((err) => {
    dbPromise = null;
    throw err;
  });
  return dbPromise;
}

function reqAsPromise<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function idbGet<T>(store: StoreName, key: IDBValidKey): Promise<T | undefined> {
  const db = await openDb();
  return reqAsPromise(db.transaction(store, "readonly").objectStore(store).get(key) as IDBRequest<T | undefined>);
}

export async function idbSet<T>(store: StoreName, key: IDBValidKey, value: T): Promise<void> {
  const db = await openDb();
  await reqAsPromise(db.transaction(store, "readwrite").objectStore(store).put(value, key));
}

export async function idbDelete(store: StoreName, key: IDBValidKey): Promise<void> {
  const db = await openDb();
  await reqAsPromise(db.transaction(store, "readwrite").objectStore(store).delete(key));
}

export async function idbGetAll<T>(store: StoreName): Promise<T[]> {
  const db = await openDb();
  return reqAsPromise(db.transaction(store, "readonly").objectStore(store).getAll() as IDBRequest<T[]>);
}

export async function idbGetAllKeys(store: StoreName): Promise<IDBValidKey[]> {
  const db = await openDb();
  return reqAsPromise(db.transaction(store, "readonly").objectStore(store).getAllKeys() as IDBRequest<IDBValidKey[]>);
}

export async function idbClearPrefix(store: StoreName, prefix: string): Promise<void> {
  const keys = await idbGetAllKeys(store);
  await Promise.all(
    keys
      .filter((k) => typeof k === "string" && (k as string).startsWith(prefix))
      .map((k) => idbDelete(store, k)),
  );
}
