import { registerPlugin, Capacitor } from "@capacitor/core";
import type { TelegramConfig, PhotoItem } from "../types";
import { uploadPhotosToTelegram } from "./uploadService";
import { getCachedPhotosFromDB } from "./photoStorage";

export interface NativePhoto {
  id: string;
  filename?: string;
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
  startLiveActivity(options: { total: number; initialFileName?: string }): Promise<{ success: boolean }>;
  updateLiveActivity(options: { current: number; total: number; currentFileName?: string; statusText?: string }): Promise<{ success: boolean }>;
  endLiveActivity(options?: { finalMessage?: string }): Promise<{ success: boolean }>;
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
    startLiveActivity: (opts: any) => callNativeMethod("startLiveActivity", opts),
    updateLiveActivity: (opts: any) => callNativeMethod("updateLiveActivity", opts),
    endLiveActivity: (opts?: any) => callNativeMethod("endLiveActivity", opts),
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
    startLiveActivity: async () => ({ success: true }),
    updateLiveActivity: async () => ({ success: true }),
    endLiveActivity: async () => ({ success: true }),
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

/**
 * Xóa toàn bộ lịch sử ID đã sao lưu để ép ứng dụng đối soát và quét lại từ đầu
 */
export function resetSyncedDeviceIds(): void {
  try {
    localStorage.removeItem(SYNCED_IDS_STORAGE_KEY);
  } catch (e) {
    console.error("Lỗi xóa synced IDs:", e);
  }
}

/**
 * Xóa một số ID thiết bị cụ thể khỏi danh sách đã sao lưu
 */
export function removeSyncedDeviceIds(ids: string[]): void {
  try {
    const current = getSyncedDeviceIds();
    ids.forEach((id) => current.delete(id));
    saveSyncedDeviceIds(current);
  } catch (e) {
    console.error("Lỗi xóa một số synced IDs:", e);
  }
}

/**
 * Dọn dẹp ID đã sao lưu theo tên file ảnh bị xóa
 */
export async function removeSyncedDeviceIdsByFilenames(filenames: string[]): Promise<void> {
  if (!Capacitor.isNativePlatform() || filenames.length === 0) return;
  try {
    const targetSet = new Set(filenames.map((f) => f.trim().toLowerCase()));
    const res = await PhotoSync.getRecentPhotos({ limit: 100 });
    const devicePhotos = res.photos || [];
    const idsToRemove: string[] = [];
    devicePhotos.forEach((dp) => {
      if (dp.filename && targetSet.has(dp.filename.toLowerCase())) {
        idsToRemove.push(dp.id);
      }
    });
    if (idsToRemove.length > 0) {
      removeSyncedDeviceIds(idsToRemove);
    }
  } catch (e) {
    console.error("Lỗi xóa synced IDs theo filename:", e);
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

let isAutoSyncRunning = false;
let lastSyncTimestamp = 0;

export async function runAutoSync(
  config: TelegramConfig,
  onProgress?: (current: number, total: number, filename: string) => void,
  existingPhotos?: PhotoItem[],
  options?: { force?: boolean }
): Promise<AutoSyncResult> {
  const isForce = !!options?.force;

  // 1. Chống chạy đồng thời (Concurrency Lock)
  if (isAutoSyncRunning) {
    return {
      success: true,
      syncedCount: 0,
      message: "Tiến trình sao lưu đang diễn ra trong nền...",
    };
  }

  const now = Date.now();
  // Chỉ debounce 3s khi quét tự động ngầm. Khi người dùng chủ động thao tác (force: true), BỎ QUA HOÀN TOÀN
  if (!isForce && now - lastSyncTimestamp < 3000) {
    return {
      success: true,
      syncedCount: 0,
      message: "Vừa hoàn tất sao lưu gần đây.",
    };
  }

  isAutoSyncRunning = true;
  lastSyncTimestamp = isForce ? 0 : now;

  try {
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

    // 2. Kiểm tra và yêu cầu quyền truy cập Photo Library với ReadWrite đầy đủ
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

    // 3. Lấy danh sách ảnh từ Camera Roll (Tối đa 60 ảnh mới nhất)
    const res = await PhotoSync.getRecentPhotos({ limit: 60 });
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

    // 4. Đối soát hai chiều (Two-Way Cloud Reconciliation)
    // Nạp danh sách ảnh Telegram: nếu existingPhotos rỗng, nạp từ IndexedDB
    let cloudPhotos = existingPhotos && existingPhotos.length > 0 ? existingPhotos : [];
    if (cloudPhotos.length === 0) {
      try {
        cloudPhotos = await getCachedPhotosFromDB();
      } catch (e) {
        console.warn("Lỗi đọc cache ảnh để đối soát:", e);
      }
    }

    const existingNames = new Set(
      cloudPhotos
        .map((p) => p.caption || "")
        .filter(Boolean)
        .map((c) => {
          const firstLine = c.split("\n")[0] || "";
          return firstLine.replace(/^📷\s*/, "").trim().toLowerCase();
        })
    );

    let syncedIds = getSyncedDeviceIds();

    if (isForce) {
      // Khi ép buộc quét (force = true - ví dụ vừa bật lại auto-sync hoặc bấm Quét ngay):
      // Tái thiết lập syncedIds CHUẨN XÁC theo những gì THỰC TẾ đang có trên Telegram!
      // Bất kỳ ảnh nào trên iPhone mà KHÔNG có trên Telegram (hoặc đã bị xóa khỏi Telegram)
      // sẽ KHÔNG nằm trong syncedIds và sẽ được tự động sao lưu lại!
      syncedIds = new Set<string>();
      devicePhotos.forEach((dp) => {
        if (dp.filename && existingNames.has(dp.filename.toLowerCase())) {
          syncedIds.add(dp.id);
        }
      });
      saveSyncedDeviceIds(syncedIds);
    } else {
      // Khi quét thông thường:
      // 1. Những ảnh nào trên máy đã có trên Telegram thì chắc chắn ghi nhận vào syncedIds
      devicePhotos.forEach((dp) => {
        if (dp.filename && existingNames.has(dp.filename.toLowerCase())) {
          syncedIds.add(dp.id);
        }
      });
      // 2. Nếu đã có dữ liệu đám mây (cloudPhotos) và có ảnh trên iPhone KHÔNG CÒN trên Telegram:
      //    (ví dụ người dùng đã xóa ảnh trên Telegram để sao lưu lại)
      //    thì loại bỏ khỏi syncedIds để cho phép sao lưu lại!
      if (cloudPhotos.length > 0) {
        devicePhotos.forEach((dp) => {
          if (dp.filename && !existingNames.has(dp.filename.toLowerCase())) {
            syncedIds.delete(dp.id);
          }
        });
      }
      saveSyncedDeviceIds(syncedIds);
    }

    // 5. Lọc ra các ảnh thực sự chưa có trên Telegram
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

    // 6. Lần lượt đọc data và tải từng ảnh lên Telegram (tối đa lô 12 ảnh mỗi lượt)
    const batch = unsynced.slice(0, 12);
    const remaining = unsynced.length - batch.length;

    // ĐÁNH DẤU TRƯỚC các ID đang xử lý vào syncedIds để ngăn chặn các trigger khác đọc trùng
    batch.forEach((item) => syncedIds.add(item.id));
    saveSyncedDeviceIds(syncedIds);

    const filesToUpload: File[] = [];
    const successfulIds: string[] = [];

    for (let i = 0; i < batch.length; i++) {
      const item = batch[i];
      if (onProgress) {
        onProgress(i + 1, batch.length, item.filename || `photo_${i + 1}.jpg`);
      }

      try {
        const dataRes = await PhotoSync.getPhotoData({ id: item.id });
        if (dataRes.base64) {
          const file = base64ToFile(
            dataRes.base64,
            dataRes.filename || item.filename || `photo_${Date.now()}.jpg`
          );
          filesToUpload.push(file);
          successfulIds.push(item.id);
        }
      } catch (photoErr) {
        console.warn(`Bỏ qua ảnh ${item.id} do lỗi đọc:`, photoErr);
        // Trả lại ID để lần sau thử lại
        syncedIds.delete(item.id);
      }
    }

    if (filesToUpload.length === 0) {
      saveSyncedDeviceIds(syncedIds);
      return {
        success: true,
        syncedCount: 0,
        isLimited,
        message: "Không đọc được tệp ảnh từ iPhone.",
      };
    }

    // 7. Upload lên Telegram Kênh "Kho ảnh đồng bộ Telegram"
    let uploadedPhotos: PhotoItem[] = [];
    try {
      uploadedPhotos = await uploadPhotosToTelegram(config, filesToUpload, (prog) => {
        if (onProgress) {
          onProgress(prog.current, prog.total, prog.currentFileName);
        }
      });
    } catch (uploadErr) {
      // Nếu upload toàn bộ thất bại, hoàn tác các ID để thử lại lần sau
      successfulIds.forEach((id) => syncedIds.delete(id));
      saveSyncedDeviceIds(syncedIds);
      throw uploadErr;
    }

    // Đảm bảo lưu chắc chắn danh sách ID đã hoàn thành
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
  } finally {
    isAutoSyncRunning = false;
  }
}

/**
 * Lấy danh sách ID ảnh đã sao lưu lên Telegram và hiện vẫn còn tồn tại trên iPhone
 */
export async function getFreeableDevicePhotos(existingPhotos?: PhotoItem[]): Promise<string[]> {
  if (!Capacitor.isNativePlatform()) return [];
  try {
    let cloudPhotos = existingPhotos && existingPhotos.length > 0 ? existingPhotos : [];
    if (cloudPhotos.length === 0) {
      try {
        cloudPhotos = await getCachedPhotosFromDB();
      } catch (e) {
        console.warn("Lỗi đọc cache ảnh khi tính freeable space:", e);
      }
    }

    const existingNames = new Set(
      cloudPhotos
        .map((p) => p.caption || "")
        .filter(Boolean)
        .map((c) => {
          const firstLine = c.split("\n")[0] || "";
          return firstLine.replace(/^📷\s*/, "").trim().toLowerCase();
        })
    );

    const res = await PhotoSync.getRecentPhotos({ limit: 100 });
    const devicePhotos = res.photos || [];

    // Chỉ cho phép giải phóng các ảnh đã được bảo chứng 100% tồn tại trên Telegram!
    const freeable = devicePhotos
      .filter((p) => p.filename && existingNames.has(p.filename.toLowerCase()))
      .map((p) => p.id);

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
  idsToDelete?: string[];
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
      return {
        success: true,
        deletedCount: res.deletedCount,
        message: `Đã giải phóng thành công ${res.deletedCount} ảnh khỏi iPhone! (Ảnh vẫn được lưu an toàn 100% trên Telegram)`,
        idsToDelete: targetIds,
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
