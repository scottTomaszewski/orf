/** Homebrew files in IndexedDB (browser). Keyed by path. */
import type { ContentFile, HomebrewStore } from "../../src/content-store.js";

const DB = "nimble-sheet", STORE = "homebrew";
function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => { req.result.createObjectStore(STORE, { keyPath: "path" }); };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T> | void): Promise<T> {
  return open().then((db) => new Promise<T>((resolve, reject) => {
    const t = db.transaction(STORE, mode);
    const r = fn(t.objectStore(STORE));
    t.oncomplete = () => resolve((r as IDBRequest<T> | undefined)?.result as T);
    t.onerror = () => reject(t.error);
  }));
}
export function indexedDbHomebrewStore(): HomebrewStore {
  return {
    list: () => tx<ContentFile[]>("readonly", (s) => s.getAll() as IDBRequest<ContentFile[]>).then((r) => (r ?? []).map((f) => ({ ...f, origin: "homebrew" as const }))),
    put: (files) => tx("readwrite", (s) => { for (const f of files) s.put({ path: f.path, text: f.text, origin: "homebrew" }); }),
    remove: (path) => tx("readwrite", (s) => { s.delete(path); }),
    clear: () => tx("readwrite", (s) => { s.clear(); }),
  };
}
