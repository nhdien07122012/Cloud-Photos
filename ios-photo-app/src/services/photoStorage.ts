/**
 * photoStorage.ts - Quản lý lưu trữ bộ nhớ đệm ảnh (IndexedDB Persistent Cache)
 * Giúp app khởi động tức thì (<50ms) không cần tải lại từ Telegram
 */

import type { PhotoItem } from "../types";

const DB_NAME = "InstaPhotosCacheDB";
const DB_VERSION = 1;
const STORE_NAME = "cached_photos";

interface StoredPhotoRecord {
  messageId: number;
  id: string;
  thumbnailData: ArrayBuffer;
  hdData?: ArrayBuffer;
  author?: string;
  caption?: string;
  originalUrl?: string;
  groupedId?: string;
  timestamp: number;
  isCarousel?: boolean;
}

// In-memory URL cache để tránh tạo lại nhiều lần trong 1 session
const objectUrlMap = new Map<number, string>();
const hdUrlMap = new Map<number, string>();

/**
 * Nhận diện MIME Type thực tế từ Magic Bytes của ảnh (JPEG, PNG, WebP, GIF)
 */
function detectMimeType(buf: ArrayBuffer): string {
  if (!buf || buf.byteLength < 4) return "image/jpeg";
  const u8 = new Uint8Array(buf.slice(0, 12));
  if (u8[0] === 0xff && u8[1] === 0xd8) return "image/jpeg";
  if (u8[0] === 0x89 && u8[1] === 0x50 && u8[2] === 0x4e && u8[3] === 0x47) return "image/png";
  if (u8[0] === 0x52 && u8[1] === 0x49 && u8[2] === 0x46 && u8[3] === 0x46) return "image/webp";
  if (u8[0] === 0x47 && u8[1] === 0x49 && u8[2] === 0x46) return "image/gif";
  return "image/jpeg";
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      return reject(new Error("IndexedDB không được hỗ trợ trên thiết bị này"));
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "messageId" });
        store.createIndex("timestamp", "timestamp", { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Đọc toàn bộ ảnh từ IndexedDB và chuyển sang PhotoItem để hiển thị tức thì
 * Tự động loại bỏ và dọn dẹp các bản ghi rác 0-byte (chống lỗi ảnh [?] trên iPhone)
 */
export async function getCachedPhotosFromDB(): Promise<PhotoItem[]> {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        const records: StoredPhotoRecord[] = request.result || [];
        // Sắp xếp bài mới nhất lên trước (timestamp giảm dần)
        records.sort((a, b) => b.timestamp - a.timestamp);

        const validPhotos: PhotoItem[] = [];
        const corruptIdsToDelete: number[] = [];

        for (const rec of records) {
          const thumbLen = rec.thumbnailData ? rec.thumbnailData.byteLength : 0;
          const hdLen = rec.hdData ? rec.hdData.byteLength : 0;

          // Nếu cả thumbnailData và hdData đều không có dữ liệu hợp lệ (< 100 bytes), đây là bản ghi rác!
          if (thumbLen < 100 && hdLen < 100) {
            corruptIdsToDelete.push(rec.messageId);
            continue;
          }

          // Ưu tiên thumbnail, fallback sang HD nếu thumbnail hỏng
          const validBuffer = thumbLen >= 100 ? rec.thumbnailData : rec.hdData!;
          const mimeType = detectMimeType(validBuffer);

          let url = objectUrlMap.get(rec.messageId);
          if (!url) {
            const blob = new Blob([validBuffer], { type: mimeType });
            url = URL.createObjectURL(blob);
            objectUrlMap.set(rec.messageId, url);
          }

          validPhotos.push({
            id: rec.id,
            messageId: rec.messageId,
            url,
            thumbnailUrl: url,
            author: rec.author,
            caption: rec.caption,
            originalUrl: rec.originalUrl,
            groupedId: rec.groupedId,
            date: new Date(rec.timestamp),
            isCarousel: rec.isCarousel,
          });
        }

        // Tự động dọn dẹp các bản ghi hỏng chạy nền để không chiếm bộ nhớ
        if (corruptIdsToDelete.length > 0) {
          console.warn(
            `[photoStorage] Đã tự động dọn dẹp ${corruptIdsToDelete.length} bản ghi rác 0-byte khỏi IndexedDB.`
          );
          removeMultiplePhotosFromCache(corruptIdsToDelete);
        }

        resolve(validPhotos);
      };

      request.onerror = () => reject(request.error);
    });
  } catch (e) {
    console.warn("Không thể đọc cache từ IndexedDB:", e);
    return [];
  }
}

/**
 * Kiểm tra danh sách messageId đã có trong IndexedDB
 * Chỉ tính các bản ghi có dung lượng thực sự hợp lệ (> 100 bytes)
 */
export async function getCachedMessageIds(): Promise<Set<number>> {
  try {
    const db = await openDatabase();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        const records = (request.result || []) as StoredPhotoRecord[];
        const validSet = new Set<number>();
        for (const r of records) {
          const tLen = r.thumbnailData ? r.thumbnailData.byteLength : 0;
          const hLen = r.hdData ? r.hdData.byteLength : 0;
          if (tLen >= 100 || hLen >= 100) {
            validSet.add(r.messageId);
          }
        }
        resolve(validSet);
      };

      request.onerror = () => resolve(new Set());
    });
  } catch {
    return new Set();
  }
}

/**
 * Lưu 1 ảnh vào IndexedDB (Tuyệt đối từ chối lưu dữ liệu rác < 100 bytes)
 */
export async function savePhotoToCache(
  item: Omit<StoredPhotoRecord, "thumbnailData" | "hdData"> & {
    thumbnailData: ArrayBuffer | Uint8Array;
    hdData?: ArrayBuffer | Uint8Array;
  }
): Promise<void> {
  try {
    // Chuyển sang ArrayBuffer sạch
    const buffer =
      item.thumbnailData instanceof ArrayBuffer
        ? item.thumbnailData
        : item.thumbnailData.buffer.slice(
            item.thumbnailData.byteOffset,
            item.thumbnailData.byteOffset + item.thumbnailData.byteLength
          );

    // Kiểm tra dung lượng hợp lệ: File ảnh JPEG/PNG hợp lệ luôn luôn >= 100 bytes
    if (!buffer || buffer.byteLength < 100) {
      console.warn(
        `[photoStorage] Từ chối lưu bản ghi 0-byte cho tin nhắn ${item.messageId} (kích thước: ${buffer?.byteLength || 0} bytes)`
      );
      return;
    }

    let cleanHdData: ArrayBuffer | undefined = undefined;
    if (item.hdData) {
      cleanHdData =
        item.hdData instanceof ArrayBuffer
          ? item.hdData
          : (item.hdData.buffer.slice(
              item.hdData.byteOffset,
              item.hdData.byteOffset + item.hdData.byteLength
            ) as ArrayBuffer);
    }

    const record: StoredPhotoRecord = {
      ...item,
      thumbnailData: buffer as ArrayBuffer,
      hdData: cleanHdData,
    };

    const db = await openDatabase();
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    store.put(record);
  } catch (e) {
    console.warn(`Lỗi lưu cache tin nhắn ${item.messageId}:`, e);
  }
}

/**
 * Lấy URL HD đã lưu trong IndexedDB (nếu có)
 */
export async function getCachedHdPhoto(messageId: number): Promise<string | null> {
  if (hdUrlMap.has(messageId)) {
    return hdUrlMap.get(messageId)!;
  }

  try {
    const db = await openDatabase();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const request = store.get(messageId);

      request.onsuccess = () => {
        const record = request.result as StoredPhotoRecord | undefined;
        if (record && record.hdData && record.hdData.byteLength >= 100) {
          const mimeType = detectMimeType(record.hdData);
          const blob = new Blob([record.hdData], { type: mimeType });
          const url = URL.createObjectURL(blob);
          hdUrlMap.set(messageId, url);
          resolve(url);
        } else {
          resolve(null);
        }
      };

      request.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

/**
 * Lưu dữ liệu ảnh HD vào IndexedDB
 */
export async function saveHdPhotoToCache(
  messageId: number,
  hdBuffer: ArrayBuffer | Uint8Array
): Promise<string> {
  const buffer =
    hdBuffer instanceof ArrayBuffer
      ? hdBuffer
      : hdBuffer.buffer.slice(
          hdBuffer.byteOffset,
          hdBuffer.byteOffset + hdBuffer.byteLength
        );

  const mimeType = detectMimeType(buffer as ArrayBuffer);
  const blob = new Blob([buffer as ArrayBuffer], { type: mimeType });
  const url = URL.createObjectURL(blob);
  hdUrlMap.set(messageId, url);

  if (buffer.byteLength >= 100) {
    try {
      const db = await openDatabase();
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const getReq = store.get(messageId);

      getReq.onsuccess = () => {
        const record = getReq.result as StoredPhotoRecord | undefined;
        if (record) {
          record.hdData = buffer as ArrayBuffer;
          store.put(record);
        }
      };
    } catch (e) {
      console.warn("Lỗi lưu ảnh HD vào cache:", e);
    }
  }

  return url;
}

/**
 * Lấy thống kê dung lượng bộ nhớ đệm
 */
export async function getCacheStats(): Promise<{ count: number; sizeMB: string }> {
  try {
    const db = await openDatabase();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        const records = (request.result || []) as StoredPhotoRecord[];
        let totalBytes = 0;
        let validCount = 0;
        for (const rec of records) {
          const t = rec.thumbnailData ? rec.thumbnailData.byteLength : 0;
          const h = rec.hdData ? rec.hdData.byteLength : 0;
          if (t >= 100 || h >= 100) {
            totalBytes += t + h;
            validCount++;
          }
        }
        const sizeMB = (totalBytes / (1024 * 1024)).toFixed(1);
        resolve({ count: validCount, sizeMB });
      };

      request.onerror = () => resolve({ count: 0, sizeMB: "0" });
    });
  } catch {
    return { count: 0, sizeMB: "0" };
  }
}

/**
 * Xóa 1 ảnh cụ thể khỏi IndexedDB và giải phóng bộ nhớ
 */
export async function removePhotoFromCache(messageId: number): Promise<void> {
  const objUrl = objectUrlMap.get(messageId);
  if (objUrl) {
    URL.revokeObjectURL(objUrl);
    objectUrlMap.delete(messageId);
  }
  const hdUrl = hdUrlMap.get(messageId);
  if (hdUrl) {
    URL.revokeObjectURL(hdUrl);
    hdUrlMap.delete(messageId);
  }

  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const request = store.delete(messageId);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (e) {
    console.warn(`Lỗi xóa ảnh ${messageId} khỏi IndexedDB:`, e);
  }
}

/**
 * Xóa nhiều ảnh cùng lúc khỏi IndexedDB và giải phóng RAM
 */
export async function removeMultiplePhotosFromCache(messageIds: number[]): Promise<void> {
  for (const id of messageIds) {
    const objUrl = objectUrlMap.get(id);
    if (objUrl) {
      URL.revokeObjectURL(objUrl);
      objectUrlMap.delete(id);
    }
    const hdUrl = hdUrlMap.get(id);
    if (hdUrl) {
      URL.revokeObjectURL(hdUrl);
      hdUrlMap.delete(id);
    }
  }

  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      messageIds.forEach((id) => store.delete(id));
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (e) {
    console.warn("Lỗi xóa nhiều ảnh khỏi IndexedDB:", e);
  }
}

/**
 * Xóa toàn bộ bộ nhớ đệm ảnh
 */
export async function clearPhotoCache(): Promise<void> {
  try {
    // Revoke các ObjectURL để tránh rò rỉ RAM
    objectUrlMap.forEach((url) => URL.revokeObjectURL(url));
    objectUrlMap.clear();

    hdUrlMap.forEach((url) => URL.revokeObjectURL(url));
    hdUrlMap.clear();

    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (e) {
    console.error("Lỗi khi xóa bộ nhớ đệm:", e);
  }
}
