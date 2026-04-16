/**
 * Çevrimdışı rutin tamamlama kuyruğu — IndexedDB (tarayıcı).
 */

const DB_NAME = "zenith-offline";
const STORE = "pending-routine-logs";
const VERSION = 1;

export type PendingRoutineLogRecord = {
  /** İstemci tarafı benzersiz kimlik */
  id: string;
  routineId: string;
  note: string | null;
  createdAt: number;
};

function isBrowser(): boolean {
  return typeof indexedDB !== "undefined";
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, VERSION);
    req.onerror = () => reject(req.error ?? new Error("IndexedDB open failed"));
    req.onsuccess = () => resolve(req.result);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id" });
      }
    };
  });
}

async function readAll(db: IDBDatabase): Promise<PendingRoutineLogRecord[]> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () => resolve((req.result as PendingRoutineLogRecord[]) ?? []);
    req.onerror = () => reject(req.error ?? new Error("IndexedDB getAll failed"));
  });
}

export async function enqueuePendingRoutineLog(input: {
  routineId: string;
  note?: string | null;
}): Promise<PendingRoutineLogRecord> {
  if (!isBrowser()) {
    throw new Error("IndexedDB yalnızca tarayıcıda kullanılabilir.");
  }
  const db = await openDb();
  const existing = await readAll(db);
  const id = crypto.randomUUID();
  const record: PendingRoutineLogRecord = {
    id,
    routineId: input.routineId,
    note: input.note?.trim() ? input.note.trim() : null,
    createdAt: Date.now(),
  };

  const duplicates = existing.filter((r) => r.routineId === input.routineId);

  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    const store = tx.objectStore(STORE);
    for (const d of duplicates) {
      store.delete(d.id);
    }
    store.put(record);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("IndexedDB write failed"));
  });

  db.close();
  return record;
}

export async function getAllPendingRoutineLogs(): Promise<PendingRoutineLogRecord[]> {
  if (!isBrowser()) return [];
  const db = await openDb();
  const rows = await readAll(db);
  db.close();
  return rows.sort((a, b) => a.createdAt - b.createdAt);
}

export async function removePendingRoutineLog(id: string): Promise<void> {
  if (!isBrowser()) return;
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("IndexedDB delete failed"));
  });
  db.close();
}

/** Geri alma: aynı rutin için bekleyen kuyruk kaydını sil. Silindiyse `true`. */
export async function removePendingByRoutineId(routineId: string): Promise<boolean> {
  if (!isBrowser()) return false;
  const all = await getAllPendingRoutineLogs();
  const match = all.find((r) => r.routineId === routineId);
  if (!match) return false;
  await removePendingRoutineLog(match.id);
  return true;
}
