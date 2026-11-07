import type {
  BibleVersionMeta,
  NormalizedBible,
  NormalizedChapter,
  OfflineBibleSummary,
} from "@/types/bible";

const DB_NAME = "selah-bible-vault-v1";
const DB_VERSION = 1;

const STORE_BIBLES = "bibles";
const STORE_BIBLE_META = "bibleMeta";
const STORE_CHAPTER_CACHE = "chapterCache";
const STORE_CATALOG_CACHE = "catalogCache";

let dbPromise: Promise<IDBDatabase> | null = null;

function openVaultDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB is not available in this browser."));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_BIBLES)) {
        db.createObjectStore(STORE_BIBLES, { keyPath: "versionId" });
      }
      if (!db.objectStoreNames.contains(STORE_BIBLE_META)) {
        db.createObjectStore(STORE_BIBLE_META, { keyPath: "versionId" });
      }
      if (!db.objectStoreNames.contains(STORE_CHAPTER_CACHE)) {
        db.createObjectStore(STORE_CHAPTER_CACHE, { keyPath: "key" });
      }
      if (!db.objectStoreNames.contains(STORE_CATALOG_CACHE)) {
        db.createObjectStore(STORE_CATALOG_CACHE, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => {
      dbPromise = null;
      reject(req.error);
    };
  });
  return dbPromise;
}

export async function saveOfflineBible(bible: NormalizedBible): Promise<OfflineBibleSummary> {
  const db = await openVaultDb();
  const summary: OfflineBibleSummary = {
    versionId: bible.versionId,
    shortName: bible.shortName,
    name: bible.name,
    language: bible.language,
    downloadedAt: bible.downloadedAt,
    sizeBytes: bible.sizeBytes,
    bookCount: bible.books.length,
  };

  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction([STORE_BIBLES, STORE_BIBLE_META], "readwrite");
    tx.objectStore(STORE_BIBLES).put(bible);
    tx.objectStore(STORE_BIBLE_META).put(summary);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });

  return summary;
}

export async function getOfflineBible(versionId: string): Promise<NormalizedBible | null> {
  try {
    const db = await openVaultDb();
    return await new Promise<NormalizedBible | null>((resolve, reject) => {
      const tx = db.transaction(STORE_BIBLES, "readonly");
      const req = tx.objectStore(STORE_BIBLES).get(versionId);
      req.onsuccess = () => resolve((req.result as NormalizedBible) || null);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return null;
  }
}

export async function listOfflineBibleSummaries(): Promise<OfflineBibleSummary[]> {
  try {
    const db = await openVaultDb();
    return await new Promise<OfflineBibleSummary[]>((resolve, reject) => {
      const tx = db.transaction(STORE_BIBLE_META, "readonly");
      const req = tx.objectStore(STORE_BIBLE_META).getAll();
      req.onsuccess = () => resolve((req.result as OfflineBibleSummary[]) || []);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return [];
  }
}

export async function deleteOfflineBible(versionId: string): Promise<void> {
  const db = await openVaultDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction([STORE_BIBLES, STORE_BIBLE_META], "readwrite");
    tx.objectStore(STORE_BIBLES).delete(versionId);
    tx.objectStore(STORE_BIBLE_META).delete(versionId);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function cacheStreamedChapter(
  versionId: string,
  bookNumber: number,
  chapter: number,
  data: NormalizedChapter
): Promise<void> {
  try {
    const db = await openVaultDb();
    const key = `${versionId}:${bookNumber}:${chapter}`;
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_CHAPTER_CACHE, "readwrite");
      tx.objectStore(STORE_CHAPTER_CACHE).put({ key, updatedAt: Date.now(), data });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // Ignore cache failures silently
  }
}

export async function getCachedStreamedChapter(
  versionId: string,
  bookNumber: number,
  chapter: number
): Promise<NormalizedChapter | null> {
  try {
    const db = await openVaultDb();
    const key = `${versionId}:${bookNumber}:${chapter}`;
    return await new Promise<NormalizedChapter | null>((resolve, reject) => {
      const tx = db.transaction(STORE_CHAPTER_CACHE, "readonly");
      const req = tx.objectStore(STORE_CHAPTER_CACHE).get(key);
      req.onsuccess = () => resolve(req.result?.data || null);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return null;
  }
}

export async function saveCachedCatalog(
  id: string,
  versions: BibleVersionMeta[]
): Promise<void> {
  try {
    const db = await openVaultDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_CATALOG_CACHE, "readwrite");
      tx.objectStore(STORE_CATALOG_CACHE).put({
        id,
        updatedAt: Date.now(),
        versions,
      });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // Ignore
  }
}

export async function getCachedCatalog(id: string): Promise<BibleVersionMeta[] | null> {
  try {
    const db = await openVaultDb();
    return await new Promise<BibleVersionMeta[] | null>((resolve, reject) => {
      const tx = db.transaction(STORE_CATALOG_CACHE, "readonly");
      const req = tx.objectStore(STORE_CATALOG_CACHE).get(id);
      req.onsuccess = () => resolve(req.result?.versions || null);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return null;
  }
}

export async function estimateDeviceStorage(): Promise<{
  usedBytes: number;
  quotaBytes: number | null;
}> {
  const summaries = await listOfflineBibleSummaries();
  const vaultBytes = summaries.reduce((acc, s) => acc + (s.sizeBytes || 0), 0);
  if (typeof navigator !== "undefined" && navigator.storage?.estimate) {
    try {
      const est = await navigator.storage.estimate();
      return {
        usedBytes: Math.max(vaultBytes, est.usage || 0),
        quotaBytes: est.quota || null,
      };
    } catch {
      // Fallback
    }
  }
  return { usedBytes: vaultBytes, quotaBytes: null };
}
