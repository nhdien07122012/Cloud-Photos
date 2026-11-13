import { registerPlugin, Capacitor } from "@capacitor/core";
import type { TelegramConfig, PhotoItem } from "../types";
import { uploadPhotosToTelegram } from "./uploadService";

export interface NativePhoto {
  id: string;
  timestamp: number;
  width: number;
  height: number;
}

export interface PhotoSyncPluginInterface {
  checkPermission(): Promise<{ granted: boolean }>;
  requestPermission(): Promise<{ granted: boolean }>;
  getRecentPhotos(options?: { limit?: number }): Promise<{ photos: NativePhoto[] }>;
  getPhotoData(options: { id: string }): Promise<{ base64: string; filename: string; size: number }>;
}

export const PhotoSync = registerPlugin<PhotoSyncPluginInterface>("PhotoSync");

const SYNCED_IDS_STORAGE_KEY = "cloud_photos_synced_device_ids";

export function getSyncedDeviceIds(): Set<string> {
  try {
    const raw = localStorage.getItem(SYNCED_IDS_STORAGE_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

export function saveSyncedDeviceIds(set: Set<string>): void {
  try {
    localStorage.setItem(SYNCED_IDS_STORAGE_KEY, JSON.stringify(Array.from(set)));
  } catch (e) {
    console.error("Lỗi lưu synced IDs:", e);
  }
}

// Chuyển Base64 sang File object để upload lên Telegram
function base64ToFile(base64: string, filename: string): File {
  const byteChars = atob(base64);
  const byteNumbers = new Array(byteChars.length);
  for (let i = 0; i < byteChars.length; i++) {
    byteNumbers[i] = byteChars.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  const blob = new Blob([byteArray], { type: "image/jpeg" });
  return new File([blob], filename, { type: "image/jpeg" });
}

export interface AutoSyncResult {
  success: boolean;
  syncedCount: number;
  message: string;
  newUploadedPhotos?: PhotoItem[];
}

export async function runAutoSync(
  config: TelegramConfig,
  onProgress?: (current: number, total: number, filename: string) => void
): Promise<AutoSyncResult> {
  if (!config.isLoggedIn && !config.sessionString) {
    return {
      success: false,
      syncedCount: 0,
      message: "Chưa đăng nhập Telegram. Vui lòng kết nối tài khoản trước.",
    };
  }

  // Kiểm tra môi trường iOS Native
  if (!Capacitor.isNativePlatform()) {
    return {
      success: false,
      syncedCount: 0,
      message:
        "Tự động đọc thư viện nền hoạt động đầy đủ khi cài đặt ứng dụng trên iPhone (.ipa). Trên trình duyệt, bạn hãy chạm nút Thêm (+) để chọn ảnh.",
    };
  }

  try {
    // 1. Kiểm tra quyền truy cập Photo Library
    const perm = await PhotoSync.checkPermission();
    if (!perm.granted) {
      const req = await PhotoSync.requestPermission();
      if (!req.granted) {
        return {
          success: false,
          syncedCount: 0,
          message: "Quyền truy cập Thư viện ảnh chưa được cấp trong Cài đặt iPhone.",
        };
      }
    }

    // 2. Lấy danh sách ảnh gần đây từ Camera Roll (30 ảnh mới nhất)
    const res = await PhotoSync.getRecentPhotos({ limit: 30 });
    const devicePhotos = res.photos || [];
    if (devicePhotos.length === 0) {
      return {
        success: true,
        syncedCount: 0,
        message: "Không tìm thấy ảnh nào trong Camera Roll của iPhone.",
      };
    }

    // 3. Lọc ra các ảnh chưa từng sao lưu
    const syncedIds = getSyncedDeviceIds();
    const unsynced = devicePhotos.filter((p) => !syncedIds.has(p.id));

    if (unsynced.length === 0) {
      return {
        success: true,
        syncedCount: 0,
        message: "Toàn bộ ảnh trên iPhone đã được sao lưu đầy đủ lên Telegram!",
      };
    }

    // 4. Lần lượt đọc data và tải từng ảnh lên Telegram (tối đa lô 10 ảnh)
    const filesToUpload: File[] = [];
    const idsToMark: string[] = [];
    const batch = unsynced.slice(0, 10);

    for (let i = 0; i < batch.length; i++) {
      const item = batch[i];
      if (onProgress) {
        onProgress(i + 1, batch.length, `Đang chuẩn bị ảnh ${i + 1}/${batch.length}...`);
      }
      const dataRes = await PhotoSync.getPhotoData({ id: item.id });
      if (dataRes.base64) {
        const file = base64ToFile(dataRes.base64, dataRes.filename);
        filesToUpload.push(file);
        idsToMark.push(item.id);
      }
    }

    if (filesToUpload.length === 0) {
      return {
        success: true,
        syncedCount: 0,
        message: "Không đọc được tệp ảnh từ iPhone.",
      };
    }

    // 5. Upload lên Telegram Kênh "Kho ảnh đồng bộ Telegram"
    const uploadedPhotos = await uploadPhotosToTelegram(config, filesToUpload, (prog) => {
      if (onProgress) {
        onProgress(prog.current, prog.total, prog.currentFileName);
      }
    });

    // 6. Lưu lại các ID đã sao lưu thành công
    idsToMark.forEach((id) => syncedIds.add(id));
    saveSyncedDeviceIds(syncedIds);

    return {
      success: true,
      syncedCount: uploadedPhotos.length,
      message: `Đã tự động sao lưu ${uploadedPhotos.length} ảnh mới từ iPhone lên Telegram!`,
      newUploadedPhotos: uploadedPhotos,
    };
  } catch (err: any) {
    console.error("Auto-sync error:", err);
    return {
      success: false,
      syncedCount: 0,
      message: "Lỗi đồng bộ tự động: " + (err.message || String(err)),
    };
  }
}
