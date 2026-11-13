import { registerPlugin, Capacitor } from "@capacitor/core";
import type { TelegramConfig, PhotoItem } from "../types";
import { uploadPhotosToTelegram } from "./uploadService";

export interface NativePhoto {
  id: string;
  timestamp: number;
  width: number;
  height: number;
}

export type PhotoPermissionStatus = "authorized" | "limited" | "denied" | "restricted" | "notDetermined" | "unknown";

export interface PermissionResult {
  status: PhotoPermissionStatus;
  granted: boolean;
  isFullAccess: boolean;
}

export interface PhotoSyncPluginInterface {
  checkPermission(): Promise<PermissionResult>;
  checkPermissions?(): Promise<PermissionResult>;
  requestPermission(): Promise<PermissionResult>;
  requestPermissions?(): Promise<PermissionResult>;
  openSettings(): Promise<{ success: boolean }>;
  presentLimitedPicker(): Promise<{ success: boolean }>;
  getRecentPhotos(options?: { limit?: number }): Promise<{ photos: NativePhoto[]; status?: string }>;
  getPhotoData(options: { id: string }): Promise<{ base64: string; filename: string; size: number }>;
  deletePhotos(options: { ids: string[] }): Promise<{ success: boolean; deletedCount: number }>;
}

const callNativeMethod = async (methodName: string, options: any = {}) => {
  const cap = (window as any).Capacitor;
  if (!cap) {
    throw new Error("Capacitor bridge chưa được nạp trên thiết bị");
  }

  // 1. Kiểm tra trực tiếp trên window.Capacitor.Plugins
  if (cap.Plugins?.PhotoSync?.[methodName]) {
    return await cap.Plugins.PhotoSync[methodName](options);
  }
  if (cap.Plugins?.PhotoSyncPlugin?.[methodName]) {
    return await cap.Plugins.PhotoSyncPlugin[methodName](options);
  }

  // 2. Gọi nativePromise trực tiếp
  if (typeof cap.nativePromise === "function") {
    try {
      return await cap.nativePromise("PhotoSync", methodName, options);
    } catch (e1: any) {
      if (e1?.message && (e1.message.includes("not implemented") || e1.message.includes("does not exist"))) {
        return await cap.nativePromise("PhotoSyncPlugin", methodName, options);
      }
      throw e1;
    }
  }

  // 3. Fallback callback
  if (typeof cap.nativeCallback === "function") {
    return new Promise((resolve, reject) => {
      cap.nativeCallback("PhotoSync", methodName, options, (res: any, err: any) => {
        if (err) reject(err);
        else resolve(res);
      });
    });
  }

  throw new Error(`Cổng giao tiếp native PhotoSync.${methodName} chưa sẵn sàng`);
};

export const PhotoSync = registerPlugin<PhotoSyncPluginInterface>("PhotoSync", {
  ios: async () => ({
    checkPermission: (opts?: any) => callNativeMethod("checkPermission", opts),
    checkPermissions: (opts?: any) => callNativeMethod("checkPermission", opts),
    requestPermission: (opts?: any) => callNativeMethod("requestPermission", opts),
    requestPermissions: (opts?: any) => callNativeMethod("requestPermission", opts),
    openSettings: (opts?: any) => callNativeMethod("openSettings", opts),
    presentLimitedPicker: (opts?: any) => callNativeMethod("presentLimitedPicker", opts),
    getRecentPhotos: (opts?: any) => callNativeMethod("getRecentPhotos", opts),
    getPhotoData: (opts: any) => callNativeMethod("getPhotoData", opts),
    deletePhotos: (opts: any) => callNativeMethod("deletePhotos", opts),
  }),
  web: async () => ({
    checkPermission: async () => ({ status: "denied", granted: false, isFullAccess: false }),
    checkPermissions: async () => ({ status: "denied", granted: false, isFullAccess: false }),
    requestPermission: async () => ({ status: "denied", granted: false, isFullAccess: false }),
    requestPermissions: async () => ({ status: "denied", granted: false, isFullAccess: false }),
    openSettings: async () => ({ success: false }),
    presentLimitedPicker: async () => ({ success: false }),
    getRecentPhotos: async () => ({ photos: [], status: "denied" }),
    getPhotoData: async () => { throw new Error("Chỉ hỗ trợ trên thiết bị iPhone (.ipa)"); },
    deletePhotos: async () => ({ success: false, deletedCount: 0 }),
  }),
});

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

// Mở trực tiếp màn hình Cài đặt của ứng dụng trên iPhone
export async function openNativeSettings(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false;
  try {
    const res = await PhotoSync.openSettings();
    return !!res.success;
  } catch {
    return false;
  }
}

// Mở giao diện chọn thêm ảnh khi đang ở quyền Limited (Truy cập riêng tư)
export async function presentLimitedLibraryPicker(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false;
  try {
    const res = await PhotoSync.presentLimitedPicker();
    return !!res.success;
  } catch {
    return false;
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
  isLimited?: boolean;
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
    // 1. Kiểm tra và yêu cầu quyền truy cập Photo Library với ReadWrite đầy đủ
    let perm = await PhotoSync.checkPermission();
    if (!perm.granted || perm.status === "notDetermined") {
      perm = await PhotoSync.requestPermission();
    }

    if (!perm.granted) {
      return {
        success: false,
        syncedCount: 0,
        message: "Chưa được cấp quyền truy cập Thư viện ảnh. Vui lòng mở Cài đặt iPhone để bật.",
      };
    }

    const isLimited = perm.status === "limited";

    // 2. Lấy danh sách ảnh từ Camera Roll (50 ảnh mới nhất)
    const res = await PhotoSync.getRecentPhotos({ limit: 50 });
    const devicePhotos = res.photos || [];

    if (devicePhotos.length === 0) {
      if (isLimited) {
        return {
          success: true,
          syncedCount: 0,
          isLimited: true,
          message:
            "Ứng dụng đang ở chế độ 'Truy cập riêng tư'. Vui lòng mở Cài đặt iPhone và chọn 'Tất cả ảnh' để sao lưu tự động.",
        };
      }
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
        isLimited,
        message: isLimited
          ? "Đã sao lưu hết các ảnh được chọn! (Để sao lưu toàn bộ máy, hãy chọn 'Tất cả ảnh' trong Cài đặt iPhone)"
          : "Toàn bộ ảnh trên iPhone đã được sao lưu đầy đủ lên Telegram!",
      };
    }

    // 4. Lần lượt đọc data và tải từng ảnh lên Telegram (tối đa lô 12 ảnh mỗi lượt)
    const filesToUpload: File[] = [];
    const idsToMark: string[] = [];
    const batch = unsynced.slice(0, 12);
    const remaining = unsynced.length - batch.length;

    for (let i = 0; i < batch.length; i++) {
      const item = batch[i];
      if (onProgress) {
        onProgress(i + 1, batch.length, `Đang chuẩn bị ảnh ${i + 1}/${batch.length}...`);
      }
      try {
        const dataRes = await PhotoSync.getPhotoData({ id: item.id });
        if (dataRes.base64) {
          const file = base64ToFile(dataRes.base64, dataRes.filename);
          filesToUpload.push(file);
          idsToMark.push(item.id);
        }
      } catch (photoErr) {
        console.warn(`Bỏ qua ảnh ${item.id} do lỗi đọc:`, photoErr);
      }
    }

    if (filesToUpload.length === 0) {
      return {
        success: true,
        syncedCount: 0,
        isLimited,
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

    const extraMsg = remaining > 0 ? ` (Còn ${remaining} ảnh sẽ tiếp tục đồng bộ)` : "";
    return {
      success: true,
      syncedCount: uploadedPhotos.length,
      isLimited,
      message: `Đã tự động sao lưu ${uploadedPhotos.length} ảnh mới từ iPhone lên Telegram!${extraMsg}`,
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

/**
 * Lấy danh sách ID ảnh đã sao lưu lên Telegram và hiện vẫn còn tồn tại trên iPhone
 */
export async function getFreeableDevicePhotos(): Promise<string[]> {
  if (!Capacitor.isNativePlatform()) return [];
  try {
    const syncedIds = getSyncedDeviceIds();
    if (syncedIds.size === 0) return [];

    const res = await PhotoSync.getRecentPhotos({ limit: 100 });
    const devicePhotos = res.photos || [];

    const freeable = devicePhotos
      .map((p) => p.id)
      .filter((id) => syncedIds.has(id));

    return freeable;
  } catch (e) {
    console.error("Lỗi kiểm tra ảnh có thể giải phóng:", e);
    return [];
  }
}

/**
 * Xóa ảnh đã sao lưu khỏi Thư viện ảnh iPhone để giải phóng bộ nhớ (Free Up Space)
 * Kích hoạt hộp thoại xác nhận gốc của iOS (PHAssetChangeRequest.deleteAssets)
 */
export async function freeUpDeviceStorage(specificIds?: string[]): Promise<{
  success: boolean;
  deletedCount: number;
  message: string;
}> {
  if (!Capacitor.isNativePlatform()) {
    return {
      success: false,
      deletedCount: 0,
      message: "Chức năng giải phóng dung lượng iPhone chỉ hoạt động trên thiết bị iPhone (.ipa).",
    };
  }

  try {
    let targetIds = specificIds;
    if (!targetIds || targetIds.length === 0) {
      targetIds = await getFreeableDevicePhotos();
    }

    if (!targetIds || targetIds.length === 0) {
      return {
        success: true,
        deletedCount: 0,
        message: "Không tìm thấy ảnh đã sao lưu nào trên máy cần dọn dẹp.",
      };
    }

    const res = await PhotoSync.deletePhotos({ ids: targetIds });
    if (res.success && res.deletedCount > 0) {
      // Dọn bớt ID đã xóa khỏi local set
      const synced = getSyncedDeviceIds();
      targetIds.forEach((id) => synced.delete(id));
      saveSyncedDeviceIds(synced);

      return {
        success: true,
        deletedCount: res.deletedCount,
        message: `Đã giải phóng thành công ${res.deletedCount} ảnh khỏi iPhone! (Ảnh vẫn được lưu an toàn 100% trên Telegram)`,
      };
    } else {
      return {
        success: false,
        deletedCount: 0,
        message: "Chưa có ảnh nào được xóa khỏi iPhone.",
      };
    }
  } catch (err: any) {
    console.error("Lỗi khi giải phóng dung lượng:", err);
    return {
      success: false,
      deletedCount: 0,
      message: "Lỗi giải phóng dung lượng: " + (err.message || String(err)),
    };
  }
}
