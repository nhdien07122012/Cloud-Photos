/**
 * fileStorage.ts - Quản lý lưu trữ bộ nhớ đệm Tệp và Thư mục (IndexedDB)
 * Cho ứng dụng Telegram Cloud Drive (TeleDrive)
 */

import type { CloudFile, FileCategory, FolderItem } from "../types";

const DB_NAME = "TeleDriveCacheDB";
const DB_VERSION = 1;
const STORE_FILES = "cached_files";
const STORE_BLOBS = "cached_blobs";
const STORE_FOLDERS = "folders";
const STORE_STARRED = "starred_ids";

// In-memory URL cache để tránh tạo lại nhiều Blob URL
const objectUrlMap = new Map<number, string>();
const blobDataMap = new Map<number, ArrayBuffer>();

export function formatBytes(bytes: number, decimals = 1): string {
  if (!bytes || bytes <= 0) return "0 B";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const idx = Math.min(i, sizes.length - 1);
  return `${parseFloat((bytes / Math.pow(k, idx)).toFixed(dm))} ${sizes[idx]}`;
}

export function getFileCategory(extension: string, mimeType = ""): FileCategory {
  const ext = (extension || "").toLowerCase().trim();
  const mime = (mimeType || "").toLowerCase().trim();

  if (
    ["jpg", "jpeg", "png", "webp", "gif", "bmp", "heic", "svg", "tiff"].includes(ext) ||
    mime.startsWith("image/")
  ) {
    return "image";
  }

  if (
    ["mp4", "mov", "mkv", "avi", "webm", "m4v", "wmv", "flv", "3gp"].includes(ext) ||
    mime.startsWith("video/")
  ) {
    return "video";
  }

  if (
    ["mp3", "m4a", "flac", "wav", "aac", "ogg", "wma", "aiff"].includes(ext) ||
    mime.startsWith("audio/")
  ) {
    return "audio";
  }

  if (
    ["pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "txt", "rtf", "odt", "ods", "odp", "pages", "numbers", "key"].includes(ext) ||
    mime.includes("pdf") ||
    mime.includes("document") ||
    mime.includes("sheet") ||
    mime.includes("presentation") ||
    mime.includes("text/plain")
  ) {
    return "document";
  }

  if (
    ["zip", "rar", "7z", "tar", "gz", "bz2", "xz", "iso", "dmg"].includes(ext) ||
    mime.includes("zip") ||
    mime.includes("compressed") ||
    mime.includes("tar")
  ) {
    return "archive";
  }

  if (
    ["ipa", "apk", "exe", "msi", "deb", "pkg", "appimage"].includes(ext)
  ) {
    return "app";
  }

  if (
    ["js", "ts", "jsx", "tsx", "html", "css", "json", "py", "c", "cpp", "h", "cs", "java", "php", "go", "rs", "swift", "kt", "sh", "yml", "yaml", "xml", "sql"].includes(ext)
  ) {
    return "code";
  }

  return "other";
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      return reject(new Error("IndexedDB không được hỗ trợ trên thiết bị này"));
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_FILES)) {
        const store = db.createObjectStore(STORE_FILES, { keyPath: "messageId" });
        store.createIndex("date", "date", { unique: false });
        store.createIndex("category", "category", { unique: false });
        store.createIndex("folder", "folder", { unique: false });
      }
      if (!db.objectStoreNames.contains(STORE_BLOBS)) {
        db.createObjectStore(STORE_BLOBS, { keyPath: "messageId" });
      }
      if (!db.objectStoreNames.contains(STORE_FOLDERS)) {
        db.createObjectStore(STORE_FOLDERS, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(STORE_STARRED)) {
        db.createObjectStore(STORE_STARRED, { keyPath: "messageId" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Lấy danh sách các tệp đã lưu trong IndexedDB cục bộ (Tải tức thì <50ms)
 */
export async function getCachedFiles(): Promise<CloudFile[]> {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([STORE_FILES, STORE_STARRED], "readonly");
      const fileStore = tx.objectStore(STORE_FILES);
      const starredStore = tx.objectStore(STORE_STARRED);

      const filesReq = fileStore.getAll();
      const starredReq = starredStore.getAll();

      tx.oncomplete = () => {
        const rawFiles = filesReq.result || [];
        const starredList = starredReq.result || [];
        const starredSet = new Set(starredList.map((s: any) => s.messageId));

        const files: CloudFile[] = rawFiles.map((item: any) => {
          let thumbUrl = item.thumbnailUrl;
          if (!thumbUrl && item.thumbnailData) {
            if (objectUrlMap.has(item.messageId)) {
              thumbUrl = objectUrlMap.get(item.messageId);
            } else {
              try {
                const blob = new Blob([item.thumbnailData], {
                  type: item.mimeType || "application/octet-stream",
                });
                thumbUrl = URL.createObjectURL(blob);
                objectUrlMap.set(item.messageId, thumbUrl);
              } catch {}
            }
          }

          return {
            id: `tg-${item.messageId}`,
            messageId: item.messageId,
            name: item.name || `Tệp_${item.messageId}`,
            size: item.size || 0,
            sizeFormatted: item.sizeFormatted || formatBytes(item.size || 0),
            mimeType: item.mimeType || "application/octet-stream",
            extension: item.extension || "",
            category: item.category || getFileCategory(item.extension, item.mimeType),
            date: new Date(item.date || item.timestamp || Date.now()),
            folder: item.folder || "/",
            thumbnailUrl: thumbUrl,
            caption: item.caption || "",
            isStarred: starredSet.has(item.messageId),
          };
        });

        // Sắp xếp mặc định: ngày mới nhất lên đầu
        files.sort((a, b) => b.date.getTime() - a.date.getTime());
        resolve(files);
      };

      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn("Lỗi đọc cache files:", err);
    return [];
  }
}

/**
 * Lưu danh sách file vào IndexedDB
 */
export async function saveFilesToCache(files: CloudFile[]): Promise<void> {
  if (!files || files.length === 0) return;
  try {
    const db = await openDatabase();
    const tx = db.transaction(STORE_FILES, "readwrite");
    const store = tx.objectStore(STORE_FILES);

    for (const f of files) {
      store.put({
        messageId: f.messageId,
        id: f.id,
        name: f.name,
        size: f.size,
        sizeFormatted: f.sizeFormatted || formatBytes(f.size),
        mimeType: f.mimeType,
        extension: f.extension,
        category: f.category,
        date: f.date.getTime(),
        folder: f.folder || "/",
        caption: f.caption || "",
      });
    }

    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn("Lỗi lưu files vào cache:", err);
  }
}

/**
 * Lưu một file đơn lẻ kèm thumbnail (ArrayBuffer)
 */
export async function saveSingleFileToCache(file: {
  messageId: number;
  name: string;
  size: number;
  mimeType: string;
  extension: string;
  category: FileCategory;
  folder?: string;
  caption?: string;
  date: number;
  thumbnailData?: ArrayBuffer;
  fullData?: ArrayBuffer;
}): Promise<void> {
  try {
    const db = await openDatabase();
    const tx = db.transaction([STORE_FILES, STORE_BLOBS], "readwrite");
    const fileStore = tx.objectStore(STORE_FILES);
    const blobStore = tx.objectStore(STORE_BLOBS);

    fileStore.put({
      messageId: file.messageId,
      id: `tg-${file.messageId}`,
      name: file.name,
      size: file.size,
      sizeFormatted: formatBytes(file.size),
      mimeType: file.mimeType,
      extension: file.extension,
      category: file.category,
      folder: file.folder || "/",
      caption: file.caption || "",
      date: file.date,
      thumbnailData: file.thumbnailData,
    });

    if (file.fullData) {
      blobStore.put({
        messageId: file.messageId,
        data: file.fullData,
        mimeType: file.mimeType,
        savedAt: Date.now(),
      });
      blobDataMap.set(file.messageId, file.fullData);
    }

    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn("Lỗi lưu single file vào cache:", err);
  }
}

/**
 * Xóa file khỏi bộ nhớ đệm
 */
export async function removeFileFromCache(messageId: number): Promise<void> {
  try {
    const db = await openDatabase();
    const tx = db.transaction([STORE_FILES, STORE_BLOBS, STORE_STARRED], "readwrite");
    tx.objectStore(STORE_FILES).delete(messageId);
    tx.objectStore(STORE_BLOBS).delete(messageId);
    tx.objectStore(STORE_STARRED).delete(messageId);

    if (objectUrlMap.has(messageId)) {
      try {
        URL.revokeObjectURL(objectUrlMap.get(messageId)!);
      } catch {}
      objectUrlMap.delete(messageId);
    }
    blobDataMap.delete(messageId);

    return new Promise((resolve) => {
      tx.oncomplete = () => resolve();
    });
  } catch (err) {
    console.warn("Lỗi xóa file khỏi cache:", err);
  }
}

/**
 * Đánh dấu sao / Bỏ đánh dấu sao
 */
export async function toggleStarFile(messageId: number): Promise<boolean> {
  try {
    const db = await openDatabase();
    const tx = db.transaction(STORE_STARRED, "readwrite");
    const store = tx.objectStore(STORE_STARRED);

    return new Promise((resolve, reject) => {
      const getReq = store.get(messageId);
      getReq.onsuccess = () => {
        if (getReq.result) {
          store.delete(messageId);
          tx.oncomplete = () => resolve(false);
        } else {
          store.put({ messageId, starredAt: Date.now() });
          tx.oncomplete = () => resolve(true);
        }
      };
      getReq.onerror = () => reject(getReq.error);
    });
  } catch {
    return false;
  }
}

/**
 * Đọc dữ liệu nhị phân của file đã tải về trong máy (Offline access)
 */
export async function getCachedFileData(messageId: number): Promise<ArrayBuffer | null> {
  if (blobDataMap.has(messageId)) {
    return blobDataMap.get(messageId)!;
  }
  try {
    const db = await openDatabase();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_BLOBS, "readonly");
      const store = tx.objectStore(STORE_BLOBS);
      const req = store.get(messageId);
      req.onsuccess = () => {
        if (req.result && req.result.data) {
          blobDataMap.set(messageId, req.result.data);
          resolve(req.result.data);
        } else {
          resolve(null);
        }
      };
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

/**
 * Lấy danh sách toàn bộ ID tin nhắn đã được tải nội dung về Cache ứng dụng (Offline sẵn sàng)
 */
export async function getDownloadedMessageIds(): Promise<Set<number>> {
  try {
    const db = await openDatabase();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_BLOBS, "readonly");
      const store = tx.objectStore(STORE_BLOBS);
      const req = store.getAllKeys();
      req.onsuccess = () => {
        const keys = (req.result || []) as number[];
        resolve(new Set(keys));
      };
      req.onerror = () => resolve(new Set());
    });
  } catch {
    return new Set();
  }
}

/**
 * Kiểm tra xem tệp đã tải nội dung về Cache ứng dụng hay chưa
 */
export async function isFileContentCached(messageId: number): Promise<boolean> {
  if (blobDataMap.has(messageId)) return true;
  try {
    const db = await openDatabase();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_BLOBS, "readonly");
      const store = tx.objectStore(STORE_BLOBS);
      const req = store.getKey(messageId);
      req.onsuccess = () => resolve(req.result !== undefined);
      req.onerror = () => resolve(false);
    });
  } catch {
    return false;
  }
}

/**
 * Lưu dữ liệu tải về của file vào Cache
 */
export async function saveCachedFileData(
  messageId: number,
  data: ArrayBuffer,
  mimeType: string
): Promise<void> {
  try {
    const db = await openDatabase();
    const tx = db.transaction(STORE_BLOBS, "readwrite");
    tx.objectStore(STORE_BLOBS).put({
      messageId,
      data,
      mimeType,
      savedAt: Date.now(),
    });
    blobDataMap.set(messageId, data);
    return new Promise((resolve) => {
      tx.oncomplete = () => resolve();
    });
  } catch (err) {
    console.warn("Lỗi lưu data file cache:", err);
  }
}

/**
 * Quản lý Thư mục người dùng (Custom Folders)
 */
export async function getCustomFolders(): Promise<FolderItem[]> {
  try {
    const db = await openDatabase();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_FOLDERS, "readonly");
      const store = tx.objectStore(STORE_FOLDERS);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => resolve([]);
    });
  } catch {
    return [];
  }
}

export async function saveCustomFolder(folder: FolderItem): Promise<void> {
  try {
    const db = await openDatabase();
    const tx = db.transaction(STORE_FOLDERS, "readwrite");
    tx.objectStore(STORE_FOLDERS).put(folder);
    return new Promise((resolve) => {
      tx.oncomplete = () => resolve();
    });
  } catch (err) {
    console.warn("Lỗi lưu thư mục:", err);
  }
}

export async function deleteCustomFolder(folderId: string): Promise<void> {
  try {
    const db = await openDatabase();
    const tx = db.transaction(STORE_FOLDERS, "readwrite");
    tx.objectStore(STORE_FOLDERS).delete(folderId);
    return new Promise((resolve) => {
      tx.oncomplete = () => resolve();
    });
  } catch (err) {
    console.warn("Lỗi xóa thư mục:", err);
  }
}

/**
 * Xóa toàn bộ bộ nhớ đệm Offline Cache
 */
export async function clearDriveCache(): Promise<void> {
  try {
    const db = await openDatabase();
    const tx = db.transaction([STORE_FILES, STORE_BLOBS], "readwrite");
    tx.objectStore(STORE_FILES).clear();
    tx.objectStore(STORE_BLOBS).clear();

    objectUrlMap.forEach((url) => {
      try {
        URL.revokeObjectURL(url);
      } catch {}
    });
    objectUrlMap.clear();
    blobDataMap.clear();

    return new Promise((resolve) => {
      tx.oncomplete = () => resolve();
    });
  } catch (err) {
    console.warn("Lỗi xóa cache drive:", err);
  }
}

export async function getDriveCacheStats(): Promise<{
  count: number;
  sizeMB: string;
  photoCount: number;
  videoCount: number;
}> {
  try {
    const files = await getCachedFiles();
    let totalBytes = 0;
    let photoCount = 0;
    let videoCount = 0;
    for (const f of files) {
      totalBytes += f.size || 0;
      if (f.category === "image") photoCount++;
      if (f.category === "video") videoCount++;
    }
    const sizeMB = (totalBytes / (1024 * 1024)).toFixed(1);
    return {
      count: files.length,
      sizeMB,
      photoCount,
      videoCount,
    };
  } catch {
    return { count: 0, sizeMB: "0", photoCount: 0, videoCount: 0 };
  }
}

// Aliases cho tương thích ngược
export const getCacheStats = getDriveCacheStats;
export const clearPhotoCache = clearDriveCache;
