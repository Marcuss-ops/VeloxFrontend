/**
 * IndexedDB-backed cache for translated-thumbnail preview Blobs.
 *
 * Stores raw JPEG Blobs rendered by `generatePreviews` keyed by
 * `${groupName}:${lang}` so that translated thumbnails survive dialog
 * closes / page reloads, addressing the blob: URL document-boundness
 * limitation flagged by the spec-reviewer pass.
 *
 * Cache semantics:
 * - Schema: single store `previews` with composite primary key `key`.
 * - Payload: { key, groupName, lang, blob, updatedAt }.
 * - TTL: 7 days. Reads return null for expired entries; an async on-mount
 *   cleanup sweeps expired entries via a cursor.
 * - Quota: best-effort. QuotaExceededError / availability errors are logged
 *   and swallowed so the in-memory previewThumbs map remains usable for
 *   the current session.
 *
 * Per-video language overrides are intentionally NOT cached — the key is
 * always (groupName, canonical-lang) as resolved by detectVideoLanguage(),
 * so overrides are ephemeral and require a manual "Genera anteprime" to
 * surface in IDB.
 */
import type { LangCode } from './youtube/languages';

const DB_NAME = 'VeloxEditorPreviews';
const STORE_NAME = 'previews';
const VERSION = 1;
export const PREVIEW_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export interface PreviewEntry {
  /** Composite primary key, format `${groupName}:${lang}`. */
  key: string;
  groupName: string;
  lang: LangCode;
  blob: Blob;
  /** Unix-ms timestamp of the most recent successful put(). */
  updatedAt: number;
}

let dbPromise: Promise<IDBDatabase> | null = null;

function isAvailable(): boolean {
  return typeof window !== 'undefined' && typeof window.indexedDB !== 'undefined';
}

function openDb(): Promise<IDBDatabase> {
  if (!isAvailable()) {
    return Promise.reject(new Error('IndexedDB unavailable in this environment'));
  }
  if (dbPromise) return dbPromise;
  dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    const req = window.indexedDB.open(DB_NAME, VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        // Composite keyPath keeps the schema flat; cursor iteration for
        // per-group clearing is acceptable at the scale we expect
        // (≈tens to low hundreds of entries).
        db.createObjectStore(STORE_NAME, { keyPath: 'key' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    // On rejection clear the cached promise so the next caller retries the
    // open (e.g. after the offending tab with the older schema closes).
    // Otherwise the rejection is sticky for the rest of the session.
    req.onerror = () => {
      dbPromise = null;
      reject(req.error ?? new Error('openDb onerror'));
    };
    req.onblocked = () => {
      dbPromise = null;
      reject(new Error('IndexedDB open blocked by another tab'));
    };
  });
  return dbPromise;
}

function makeKey(groupName: string, lang: LangCode): string {
  return `${groupName}:${lang}`;
}

/**
 * Read a single preview blob. Returns `null` for misses, expired entries,
 * IDB unavailability, or any quota/availability error (logged at warn level).
 */
export async function getPreview(
  groupName: string,
  lang: LangCode,
  ttlMs: number = PREVIEW_TTL_MS,
): Promise<Blob | null> {
  if (!isAvailable()) return null;
  try {
    const db = await openDb();
    return await new Promise<Blob | null>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(makeKey(groupName, lang));
      req.onsuccess = () => {
        const entry = req.result as PreviewEntry | undefined;
        if (!entry) {
          resolve(null);
          return;
        }
        if (Date.now() - entry.updatedAt > ttlMs) {
          resolve(null);
          return;
        }
        resolve(entry.blob);
      };
      req.onerror = () => reject(req.error ?? new Error('getPreview onerror'));
    });
  } catch (err) {
    console.warn('[previewCache] getPreview failed:', err);
    return null;
  }
}

/**
 * Write a preview blob. Best-effort: silently swallows quota/availability
 * errors so the in-memory cache remains usable. Refreshes `updatedAt` on
 * overwrite, which is how the TTL is reset.
 */
export async function putPreview(groupName: string, lang: LangCode, blob: Blob): Promise<void> {
  if (!isAvailable()) return;
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const entry: PreviewEntry = {
        key: makeKey(groupName, lang),
        groupName,
        lang,
        blob,
        updatedAt: Date.now(),
      };
      const req = store.put(entry);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error ?? new Error('putPreview onerror'));
      // QuotaExceededError surfaces here; we catch it in the outer try/catch.
    });
  } catch (err) {
    // Persist failures (quota, blocked, etc.) are non-fatal: the in-memory
    // blob: URL keeps working for the current dialog session.
    console.warn('[previewCache] putPreview failed (non-fatal):', err);
  }
}

/**
 * Sweep expired entries (`updatedAt` older than `ttlMs`). Safe to call
 * concurrently with get/put; IDB transactions are serialized per-connection.
 * Best-effort: logs and ignores failures.
 */
export async function sweepExpiredPreviews(ttlMs: number = PREVIEW_TTL_MS): Promise<number> {
  if (!isAvailable()) return 0;
  try {
    const db = await openDb();
    return await new Promise<number>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.openCursor();
      let removed = 0;
      req.onsuccess = () => {
        const cursor = req.result as IDBCursorWithValue | null;
        if (!cursor) {
          resolve(removed);
          return;
        }
        const entry = cursor.value as PreviewEntry;
        if (Date.now() - entry.updatedAt > ttlMs) {
          cursor.delete();
          removed += 1;
        }
        cursor.continue();
      };
      req.onerror = () => reject(req.error ?? new Error('sweep onerror'));
    });
  } catch (err) {
    console.warn('[previewCache] sweepExpiredPreviews failed:', err);
    return 0;
  }
}

/**
 * Clear all entries tied to a specific group name. Leaves other groups'
 * previews untouched. Currently unused by the UI (per-group stays warm for
 * re-visit; TTL handles garbage collection), but exposed for ops/debug.
 */
export async function clearGroupPreviews(groupName: string): Promise<void> {
  if (!isAvailable()) return;
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.openCursor();
      req.onsuccess = () => {
        const cursor = req.result as IDBCursorWithValue | null;
        if (!cursor) {
          resolve();
          return;
        }
        const entry = cursor.value as PreviewEntry;
        if (entry.groupName === groupName) cursor.delete();
        cursor.continue();
      };
      req.onerror = () => reject(req.error ?? new Error('clear onerror'));
    });
  } catch (err) {
    console.warn('[previewCache] clearGroupPreviews failed:', err);
  }
}

/**
 * Test-only: reset the cached open-Database promise so subsequent calls
 * re-open with the current VERSION. No-op in production.
 */
export function __resetDbPromiseForTests(): void {
  dbPromise = null;
}
