// Minimal IndexedDB key-value store backing the offline READ cache.
// Stores whole snapshots (arrays of already-mapped domain objects) under fixed
// keys, plus a 'meta' record with the last sync time and row counts. No deps.
//
// PRIVACY: these snapshots hold DECRYPTED PII on the local device (the cloud
// keeps it encrypted). The Offline page lets the registrar wipe this cache.

const DB_NAME = 'nps-registrar-offline';
const STORE = 'kv';

export const SNAP = {
  students: 'students',
  classes: 'classes',
  teachers: 'teachers',
  schoolYears: 'schoolYears',
  subjects: 'subjects',
  schools: 'schools',
  transfers: 'transfers',
  esc: 'esc',
  form137log: 'form137log',
  meta: 'meta',
} as const;

export interface OfflineMeta {
  lastSyncedAt: string;
  counts: Record<string, number>;
}

let dbp: Promise<IDBDatabase> | null = null;
function openDb(): Promise<IDBDatabase> {
  if (!dbp) {
    dbp = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => {
        if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE);
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  return dbp;
}

export async function idbGet<T>(key: string): Promise<T | undefined> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const r = tx.objectStore(STORE).get(key);
    r.onsuccess = () => resolve(r.result as T | undefined);
    r.onerror = () => reject(r.error);
  });
}

export async function idbSet(key: string, value: unknown): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function idbClearAll(): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getOfflineMeta(): Promise<OfflineMeta | undefined> {
  return idbGet<OfflineMeta>(SNAP.meta);
}

export function isOnline(): boolean {
  return typeof navigator === 'undefined' ? true : navigator.onLine;
}
