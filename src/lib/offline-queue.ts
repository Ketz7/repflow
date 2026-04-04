/**
 * Offline queue — stores workout session data in IndexedDB when Supabase
 * is unreachable, then drains the queue when connectivity is restored.
 *
 * Structure stored per entry:
 *   sessionId  — the workout_sessions row that needs ended_at set
 *   endedAt    — ISO timestamp of when the user tapped "End Workout"
 *   sets       — session_sets rows to insert
 */

const DB_NAME = "repflow_offline";
const DB_VERSION = 1;
const STORE = "queue";
export const SYNC_TAG = "repflow-session-sync";

export interface OfflineSession {
  sessionId: string;
  endedAt: string;
  sets: Array<{
    session_id: string;
    exercise_id: string;
    set_number: number;
    reps_completed: number;
    weight_used: number | null;
  }>;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) {
        req.result.createObjectStore(STORE, { keyPath: "sessionId" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function enqueueOfflineSession(data: OfflineSession): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(data);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function getAllQueued(db: IDBDatabase): Promise<OfflineSession[]> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () => resolve(req.result as OfflineSession[]);
    req.onerror = () => reject(req.error);
  });
}

async function removeFromQueue(db: IDBDatabase, sessionId: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(sessionId);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Drains all queued offline sessions to Supabase.
 * Returns the number of sessions successfully synced.
 */
export async function drainOfflineQueue(): Promise<number> {
  // Dynamically import supabase to avoid circular deps and keep this lib pure
  const { createClient } = await import("@/lib/supabase/client");
  const supabase = createClient();

  const db = await openDB();
  const items = await getAllQueued(db);
  if (items.length === 0) return 0;

  let synced = 0;
  for (const item of items) {
    try {
      if (item.sets.length > 0) {
        const { error } = await supabase.from("session_sets").insert(item.sets);
        if (error) throw error;
      }
      const { error } = await supabase
        .from("workout_sessions")
        .update({ ended_at: item.endedAt })
        .eq("id", item.sessionId);
      if (error) throw error;
      await removeFromQueue(db, item.sessionId);
      synced++;
    } catch {
      // Leave failed entries in queue — retry next drain
    }
  }
  return synced;
}

export async function hasPendingOfflineSessions(): Promise<boolean> {
  const db = await openDB();
  const items = await getAllQueued(db);
  return items.length > 0;
}
