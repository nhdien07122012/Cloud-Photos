/**
 * telegramDriveService.ts - Dịch vụ quản lý tệp tin trên Telegram Cloud Drive qua MTProto
 * Hỗ trợ mọi định dạng tệp: Tài liệu (PDF, Word, Excel), File nén (ZIP, RAR), Media, App (IPA, APK)...
 * Dung lượng tối đa lên đến 2GB / tệp (hoặc 4GB với tài khoản Premium)
 */

import type { CloudFile, TelegramConfig } from "../types";
import {
  saveSingleFileToCache,
  getCachedFiles,
  formatBytes,
  getFileCategory,
  saveCachedFileData,
  getCachedFileData,
  removeFileFromCache,
  clearDriveCache,
} from "./fileStorage";
import { Buffer } from "buffer";

// Khóa lưu cấu hình
const CONFIG_STORAGE_KEY = "teledrive_tg_config";

export const DEFAULT_CONFIG: TelegramConfig = {
  apiId: localStorage.getItem("tg_api_id") || "",
  apiHash: localStorage.getItem("tg_api_hash") || "",
  botToken: localStorage.getItem("tg_bot_token") || "",
  channelId: localStorage.getItem("teledrive_channel_id") || localStorage.getItem("cloud_photos_channel_id") || "",
  phoneNumber: localStorage.getItem("tg_phone") || "",
  sessionString: localStorage.getItem("tg_session") || "",
  isLoggedIn: !!localStorage.getItem("tg_session"),
};

export function getStoredConfig(): TelegramConfig {
  const stored = localStorage.getItem(CONFIG_STORAGE_KEY);
  if (stored) {
    try {
      return { ...DEFAULT_CONFIG, ...JSON.parse(stored) };
    } catch {
      return DEFAULT_CONFIG;
    }
  }
  return DEFAULT_CONFIG;
}

export function saveStoredConfig(config: TelegramConfig) {
  localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(config));
  if (config.channelId) {
    localStorage.setItem("teledrive_channel_id", config.channelId);
  }
}

/**
 * Danh sách tệp mẫu khi chưa kết nối Telegram
 */
export const SAMPLE_FILES: CloudFile[] = [
  {
    id: "sample-1",
    messageId: 201,
    name: "TaiLieu_HuongDan_SuDung.pdf",
    size: 2450000,
    sizeFormatted: "2.4 MB",
    mimeType: "application/pdf",
    extension: "pdf",
    category: "document",
    date: new Date(Date.now() - 3600000 * 2),
    folder: "Tài liệu quan trọng",
    caption: "📄 Hướng dẫn sử dụng Telegram Cloud Drive",
  },
  {
    id: "sample-2",
    messageId: 202,
    name: "BaoCao_TaiChinh_Q4_2026.xlsx",
    size: 1850000,
    sizeFormatted: "1.8 MB",
    mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    extension: "xlsx",
    category: "document",
    date: new Date(Date.now() - 3600000 * 5),
    folder: "Tài liệu quan trọng",
    caption: "📊 Báo cáo tài chính chi tiết",
  },
  {
    id: "sample-3",
    messageId: 203,
    name: "CloudPhotos_v1.3_Build25.ipa",
    size: 2280000,
    sizeFormatted: "2.3 MB",
    mimeType: "application/octet-stream",
    extension: "ipa",
    category: "app",
    date: new Date(Date.now() - 86400000),
    folder: "Ứng dụng & Cài đặt",
    caption: "📱 Bản cài đặt iOS CloudPhotos IPA",
  },
  {
    id: "sample-4",
    messageId: 204,
    name: "BoSuuTap_HinhNen_4K.zip",
    size: 65400000,
    sizeFormatted: "65.4 MB",
    mimeType: "application/zip",
    extension: "zip",
    category: "archive",
    date: new Date(Date.now() - 86400000 * 2),
    folder: "File nén & Backup",
    caption: "📦 Bộ sưu tập hình nền chất lượng cao",
  },
  {
    id: "sample-5",
    messageId: 205,
    name: "Video_ChuyenDi_DaLat.mp4",
    size: 145000000,
    sizeFormatted: "145.0 MB",
    mimeType: "video/mp4",
    extension: "mp4",
    category: "video",
    date: new Date(Date.now() - 86400000 * 3),
    folder: "Media & Kỷ niệm",
    caption: "🎬 Video chuyến đi Đà Lạt",
  },
];

let globalClient: any = null;

/**
 * Khởi tạo MTProto Telegram Client qua GramJS
 */
export async function initDriveClient(config: TelegramConfig): Promise<any> {
  if (globalClient && globalClient.connected) {
    return globalClient;
  }

  if (!config.apiId || !config.apiHash) {
    throw new Error("Chưa điền API_ID hoặc API_HASH từ my.telegram.org");
  }

  const { TelegramClient } = await import("telegram");
  const { StringSession } = await import("telegram/sessions");

  const session = new StringSession(config.sessionString || "");
  const client = new TelegramClient(
    session,
    parseInt(config.apiId, 10),
    config.apiHash,
    {
      connectionRetries: 5,
      useWSS: true,
    }
  );

  await client.connect();

  if (!config.sessionString && config.botToken) {
    try {
      await client.start({ botAuthToken: config.botToken });
    } catch (e) {
      console.warn("Khởi động bot token MTProto:", e);
    }
  }

  globalClient = client;
  return client;
}

export interface TelegramChannelInfo {
  id: string;
  title: string;
  username?: string;
  isCurrent?: boolean;
}

/**
 * Lấy danh sách tất cả các Kênh / Nhóm mà tài khoản Telegram đang tham gia
 */
export async function fetchUserChannels(
  config: TelegramConfig
): Promise<TelegramChannelInfo[]> {
  try {
    const client = await initDriveClient(config);
    const dialogs: any = await client.getDialogs({ limit: 100 });
    const channels: TelegramChannelInfo[] = [];

    for (const d of dialogs) {
      const isChannel = d.isChannel || (d.entity && d.entity.className === "Channel");
      const isGroup = d.isGroup || (d.entity && (d.entity.className === "Chat" || (d.entity.className === "Channel" && d.entity.megagroup)));

      if (isChannel || isGroup) {
        const title = (d.title || d.name || (d.entity && (d.entity.title || d.entity.username)) || "Kênh không tên").trim();
        const id = d.id?.toString() || (d.entity && d.entity.id?.toString());
        const username = d.entity?.username;
        if (id && !channels.some((c) => c.id === id)) {
          channels.push({
            id,
            title,
            username,
            isCurrent: id === config.channelId,
          });
        }
      }
    }

    return channels;
  } catch (err) {
    console.warn("Lỗi lấy danh sách kênh Telegram:", err);
    return [];
  }
}

export interface ResolvedPeerInfo {
  peer: any;
  title: string;
  id: string;
}

/**
 * Phân giải Kênh Telegram thông minh:
 * Hỗ trợ: Tên Kênh ("IPA-MOD [DienNguyen]"), Username ("@channel"), hoặc ID số ("-1004288667686")
 */
export async function resolveChannelPeer(
  client: any,
  channelInput?: string
): Promise<ResolvedPeerInfo | null> {
  const input = (channelInput || "").trim();
  if (!input) return null;

  // 1. Quét danh sách dialogs của tài khoản (lấy đến 200 dialogs)
  try {
    const dialogs: any = await client.getDialogs({ limit: 200 });
    const rawInputId = input.replace(/^-100/, "").replace(/^-/, "").trim();
    const isPureNumeric = /^\d+$/.test(rawInputId);
    const normInput = input.toLowerCase().replace(/[\[\]\(\)\{\}\-_\s]+/g, " ").trim();

    for (const d of dialogs) {
      const isChannelOrGroup =
        d.isChannel ||
        d.isGroup ||
        (d.entity && (d.entity.className === "Channel" || d.entity.className === "Chat"));
      if (!isChannelOrGroup && !d.entity) continue;

      const dTitle = (d.title || d.name || d.entity?.title || "").trim();
      const normDTitle = dTitle.toLowerCase().replace(/[\[\]\(\)\{\}\-_\s]+/g, " ").trim();
      const dUsername = (d.entity?.username || "").trim().toLowerCase();
      const dIdStr = (d.id?.toString() || "").trim();
      const dEntityIdStr = (d.entity?.id?.toString() || "").trim();
      const rawDId = dIdStr.replace(/^-100/, "").replace(/^-/, "").trim();
      const rawEntityId = dEntityIdStr.replace(/^-100/, "").replace(/^-/, "").trim();

      // So khớp 1: Trùng ID số (bỏ qua tiền tố -100 hoặc -)
      if (isPureNumeric && (rawInputId === rawDId || rawInputId === rawEntityId)) {
        return {
          peer: d.inputEntity || d.entity,
          title: dTitle || "Kênh lưu trữ",
          id: dIdStr || dEntityIdStr,
        };
      }

      // So khớp 2: Trùng Username (@...)
      if (dUsername && input.toLowerCase().replace("@", "") === dUsername) {
        return {
          peer: d.inputEntity || d.entity,
          title: dTitle || `@${dUsername}`,
          id: dIdStr || dEntityIdStr,
        };
      }

      // So khớp 3: Trùng tên kênh chuẩn hóa (bỏ qua dấu ngoặc vuông, gạch ngang, khoảng trắng)
      if (normInput && (normDTitle === normInput || dTitle.toLowerCase() === input.toLowerCase())) {
        return {
          peer: d.inputEntity || d.entity,
          title: dTitle,
          id: dIdStr || dEntityIdStr,
        };
      }

      // So khớp 4: Chứa chuỗi tên kênh (Ví dụ "IPA-MOD" nằm trong "IPA-MOD [DienNguyen]")
      if (
        normInput.length >= 3 &&
        (normDTitle.includes(normInput) || normInput.includes(normDTitle))
      ) {
        return {
          peer: d.inputEntity || d.entity,
          title: dTitle,
          id: dIdStr || dEntityIdStr,
        };
      }
    }
  } catch (err) {
    console.warn("Lỗi khi tìm kiếm kênh qua getDialogs:", err);
  }

  // 2. Thử lấy InputEntity hoặc Entity trực tiếp
  try {
    const inputEntity = await client.getInputEntity(input);
    if (inputEntity) {
      return { peer: inputEntity, title: input, id: input };
    }
  } catch {}

  try {
    const entity = await client.getEntity(input);
    if (entity) {
      const title = entity.title || entity.username || input;
      return { peer: entity, title, id: entity.id?.toString() || input };
    }
  } catch {}

  // 3. Nếu là chuỗi số có dấu âm hoặc bắt đầu bằng -100
  const rawId = input.replace(/^-100/, "").replace(/^-/, "").trim();
  if (/^\d+$/.test(rawId)) {
    try {
      const entity = await client.getEntity(BigInt("-100" + rawId));
      if (entity) {
        return { peer: entity, title: entity.title || "Kênh lưu trữ", id: input };
      }
    } catch {}
    try {
      const entity = await client.getEntity(BigInt(rawId));
      if (entity) {
        return { peer: entity, title: entity.title || "Kênh lưu trữ", id: input };
      }
    } catch {}
  }

  return null;
}

/**
 * Tự động tìm Kênh Cloud Drive trong danh sách hội thoại
 */
export async function autoDetectDriveChannel(
  config: TelegramConfig
): Promise<{ id: string; title: string } | null> {
  try {
    const client = await initDriveClient(config);
    const dialogs: any = await client.getDialogs({ limit: 100 });
    for (const d of dialogs) {
      const title = (d.title || d.name || "").toLowerCase();
      if (
        title.includes("ipa-mod") ||
        title.includes("diennguyen") ||
        title.includes("cloud drive") ||
        title.includes("teledrive") ||
        title.includes("kho lưu trữ") ||
        title.includes("kho dữ liệu") ||
        title.includes("kho ảnh đồng bộ")
      ) {
        const id = d.id?.toString();
        if (id) {
          return { id, title: d.title || d.name };
        }
      }
    }
  } catch (err) {
    console.warn("Không thể quét kênh drive tự động:", err);
  }
  return null;
}

/**
 * Lấy danh sách tệp tin từ Kênh Telegram với hỗ trợ IndexedDB Cache
 */
export async function fetchDriveFiles(
  config: TelegramConfig,
  limit: number = 150
): Promise<CloudFile[]> {
  if (!config.apiId || !config.apiHash) {
    return SAMPLE_FILES;
  }

  if (!config.sessionString && !config.isLoggedIn) {
    throw new Error(
      "CHUA_DANG_NHAP: Bạn cần đăng nhập tài khoản Telegram bằng số điện thoại để truy cập Cloud Drive."
    );
  }

  try {
    const client = await initDriveClient(config);

    let channelId = (config.channelId || "").trim();
    if (!channelId) {
      const detected = await autoDetectDriveChannel(config);
      if (detected) {
        channelId = detected.id;
        config.channelId = detected.id;
        config.channelTitle = detected.title;
        saveStoredConfig(config);
      }
    }

    if (!channelId) {
      const fallbackFiles = await getCachedFiles();
      return fallbackFiles.length > 0 ? fallbackFiles : [];
    }

    // Kiểm tra xem người dùng có đổi sang kênh khác không
    const lastChannelKey = "teledrive_active_channel_id";
    const previousChannel = localStorage.getItem(lastChannelKey);
    const isChannelSwitch = previousChannel && previousChannel !== channelId;

    if (isChannelSwitch) {
      // Khi đổi kênh: Xóa sạch cache của kênh cũ để nạp toàn bộ tệp của kênh mới
      await clearDriveCache();
    }
    localStorage.setItem(lastChannelKey, channelId);

    // Phân giải Kênh Telegram thông minh
    const resolved = await resolveChannelPeer(client, channelId);
    const targetPeer: any = resolved ? resolved.peer : channelId;

    // Cập nhật tên hiển thị thân thiện (không lưu ID số xấu xí)
    if (resolved && resolved.title) {
      if (config.channelTitle !== resolved.title) {
        config.channelTitle = resolved.title;
        saveStoredConfig(config);
      }
    }

    // 1. Đọc cache cục bộ trước
    const cachedFiles = await getCachedFiles();
    const cachedIds = new Set(cachedFiles.map((f) => f.messageId));

    // 2. Lấy danh sách tin nhắn từ Kênh Telegram
    const messages = await client.getMessages(targetPeer, { limit });

    for (const msg of messages) {
      if (!msg.media) continue;
      const isDoc = !!msg.media.document;
      const isPhoto = !!msg.media.photo;
      if (!isDoc && !isPhoto) continue;

      if (cachedIds.has(msg.id)) continue;

      try {
        let fileName = `Tệp_${msg.id}`;
        let fileSize = 0;
        let mimeType = "application/octet-stream";
        let extension = "";
        let folder = "/";

        if (isDoc && msg.media.document) {
          const doc = msg.media.document;
          fileSize = doc.size ? Number(doc.size) : 0;
          mimeType = doc.mimeType || "application/octet-stream";

          // Tìm tên file từ attributes
          const nameAttr = doc.attributes?.find(
            (a: any) => a.className === "DocumentAttributeFilename" || a.fileName
          );
          if (nameAttr && nameAttr.fileName) {
            fileName = nameAttr.fileName;
          } else if (msg.message && msg.message.trim().length > 0) {
            // Lấy dòng đầu tiên của caption làm tên file nếu hợp lệ
            const firstLine = msg.message.split("\n")[0].replace(/^[📷🎥📄📦📱🎬🎵📁\s]+/, "").trim();
            if (firstLine.includes(".") && firstLine.length < 80) {
              fileName = firstLine;
            }
          }

          const parts = fileName.split(".");
          if (parts.length > 1) {
            extension = parts[parts.length - 1].toLowerCase();
          }
        } else if (isPhoto) {
          fileName = `IMG_${msg.id}.jpg`;
          extension = "jpg";
          mimeType = "image/jpeg";
          fileSize = 1024 * 500; // Ước tính ảnh
        }

        // Trích xuất Thư mục từ caption (Ví dụ: [Thư mục: Tài liệu] hoặc 📁 Tài liệu)
        if (msg.message) {
          const folderMatch = msg.message.match(/(?:\[Thư mục:\s*|📁\s*|\/)([a-zA-Z0-9_\sÀ-ỹ]+)(?:\]|\n|$)/i);
          if (folderMatch && folderMatch[1]) {
            folder = folderMatch[1].trim();
          }
        }

        // Phân loại tệp
        const category = getFileCategory(extension, mimeType);

        // Tải thumbnail nếu là ảnh hoặc video (với timeout 1.5s để không làm nghẽn tiến trình)
        let thumbBuffer: any = null;
        if (category === "image" || category === "video") {
          try {
            thumbBuffer = await Promise.race([
              client.downloadMedia(msg.media, { thumb: 1 }),
              new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 1500)),
            ]);
          } catch {}
        }

        const fileDate = msg.date ? msg.date * 1000 : Date.now();

        await saveSingleFileToCache({
          messageId: msg.id,
          name: fileName,
          size: fileSize,
          mimeType,
          extension,
          category,
          folder,
          caption: msg.message || "",
          date: fileDate,
          thumbnailData: thumbBuffer && thumbBuffer.length >= 100 ? thumbBuffer : undefined,
        });

        cachedIds.add(msg.id);
      } catch (err) {
        console.warn(`Lỗi xử lý tệp tin nhắn #${msg.id}:`, err);
      }
    }

    // 4. Trả về toàn bộ tệp từ IndexedDB đã cập nhật
    const updatedFiles = await getCachedFiles();
    return updatedFiles;
  } catch (error: any) {
    console.error("Lỗi lấy tệp từ Telegram Drive:", error);
    const fallbackFiles = await getCachedFiles();
    if (fallbackFiles.length > 0) return fallbackFiles;
    throw new Error(error.message || "Không thể tải danh sách tệp từ Kênh");
  }
}

/**
 * Tải toàn bộ nội dung tệp từ Telegram về máy
 */
export async function downloadTelegramFile(
  config: TelegramConfig,
  messageId: number,
  onProgress?: (progress: number, speed?: string) => void
): Promise<{ blob: Blob; fileName: string; mimeType: string }> {
  // 1. Kiểm tra cache đã tải trước đó
  const cachedData = await getCachedFileData(messageId);
  const allFiles = await getCachedFiles();
  const fileMeta = allFiles.find((f) => f.messageId === messageId);
  const fileName = fileMeta?.name || `file_${messageId}`;
  const mimeType = fileMeta?.mimeType || "application/octet-stream";

  if (cachedData && cachedData.byteLength > 0) {
    if (onProgress) onProgress(100, "100%");
    return {
      blob: new Blob([cachedData], { type: mimeType }),
      fileName,
      mimeType,
    };
  }

  // 2. Tải trực tiếp từ Telegram MTProto
  const client = await initDriveClient(config);
  const resolved = await resolveChannelPeer(client, config.channelId);
  const targetPeer: any = resolved ? resolved.peer : config.channelId;

  const messages = await client.getMessages(targetPeer, { ids: [messageId] });
  if (!messages || !messages[0] || !messages[0].media) {
    throw new Error(`Không tìm thấy dữ liệu tệp cho tin nhắn #${messageId}`);
  }

  const targetMedia = messages[0].media;
  let startTime = Date.now();
  let lastBytes = 0;
  let lastTime = startTime;

  const rawBuffer: any = await client.downloadMedia(targetMedia, {
    progressCallback: (downloaded: any, total: any) => {
      const now = Date.now();
      const currentBytes = Number(downloaded);
      const totalBytes = Number(total);
      const percent = totalBytes > 0 ? Math.round((currentBytes / totalBytes) * 100) : 0;

      const elapsed = (now - lastTime) / 1000;
      let speedStr = "Đang tải...";
      if (elapsed >= 0.5) {
        const speedBps = (currentBytes - lastBytes) / (elapsed || 1);
        speedStr = `${formatBytes(speedBps)}/s`;
        lastBytes = currentBytes;
        lastTime = now;
      }

      if (onProgress && total) {
        onProgress(Math.min(percent, 99), speedStr);
      }
    },
  });

  if (!rawBuffer) {
    throw new Error("Tải tệp không thành công. Dữ liệu rỗng.");
  }

  // Lưu vào IndexedDB để lần sau mở tức thì
  await saveCachedFileData(messageId, rawBuffer, mimeType);
  if (onProgress) onProgress(100, "Xong");

  return {
    blob: new Blob([rawBuffer], { type: mimeType }),
    fileName,
    mimeType,
  };
}

/**
 * Tải lên tệp bất kỳ lên Telegram Cloud Drive
 * Hỗ trợ dung lượng lớn tới 2GB với chia gói chunking tự động
 */
export async function uploadDriveFile(
  config: TelegramConfig,
  file: File,
  folder = "/",
  onProgress?: (percent: number, speed: string) => void
): Promise<CloudFile> {
  const client = await initDriveClient(config);
  const resolved = await resolveChannelPeer(client, config.channelId);
  const targetPeer: any = resolved ? resolved.peer : config.channelId;

  const { CustomFile } = await import("telegram/client/uploads");

  const rawBuffer = await file.arrayBuffer();
  const nodeBuffer = Buffer.from(rawBuffer);
  const fileSize = rawBuffer.byteLength;

  const customFile = new CustomFile(
    file.name,
    fileSize,
    file.name,
    nodeBuffer
  );

  let startTime = Date.now();
  let lastBytes = 0;

  // 1. Upload file qua MTProto chunking
  const fileHandle = await client.uploadFile({
    file: customFile,
    workers: 1,
    maxBufferSize: 2 * 1024 * 1024 * 1024, // 2GB buffer
    onProgress: (percent: number) => {
      const now = Date.now();
      const elapsed = (now - startTime) / 1000;
      const currentBytes = (percent / 100) * fileSize;
      let speedStr = "Đang tải...";
      if (elapsed > 0.5) {
        const speedBps = (currentBytes - lastBytes) / (elapsed || 1);
        speedStr = `${formatBytes(speedBps)}/s`;
      }
      if (onProgress) {
        onProgress(Math.round(percent * 100) / 100, speedStr);
      }
    },
  });

  // 2. Gửi file lên Kênh với forceDocument: true để bảo toàn 100% nguyên gốc
  const folderTag = folder && folder !== "/" ? `\n📁 ${folder}` : "";
  const caption = `📄 ${file.name}\n⚖️ ${formatBytes(fileSize)}${folderTag}\n📅 ${new Date().toLocaleDateString("vi-VN")}`;

  const sentMessage: any = await client.sendFile(targetPeer, {
    file: fileHandle,
    caption,
    forceDocument: true, // Giữ nguyên gốc 100% không nén
    workers: 1,
  });

  const messageId = sentMessage?.id || Date.now();
  const extension = file.name.split(".").pop()?.toLowerCase() || "";
  const mimeType = file.type || "application/octet-stream";
  const category = getFileCategory(extension, mimeType);

  // 3. Lưu vào Cache IndexedDB
  await saveSingleFileToCache({
    messageId,
    name: file.name,
    size: fileSize,
    mimeType,
    extension,
    category,
    folder: folder || "/",
    caption,
    date: Date.now(),
    fullData: rawBuffer,
  });

  return {
    id: `tg-${messageId}`,
    messageId,
    name: file.name,
    size: fileSize,
    sizeFormatted: formatBytes(fileSize),
    mimeType,
    extension,
    category,
    folder: folder || "/",
    date: new Date(),
    caption,
  };
}

/**
 * Xóa danh sách tệp vĩnh viễn trên Telegram Kênh
 */
export async function deleteDriveFiles(
  config: TelegramConfig,
  messageIds: number[]
): Promise<boolean> {
  if (messageIds.length === 0) return true;
  let deleted = false;

  if (config.sessionString || config.isLoggedIn) {
    try {
      const client = await initDriveClient(config);
      const resolved = await resolveChannelPeer(client, config.channelId);
      const targetPeer: any = resolved ? resolved.peer : config.channelId;

      await client.deleteMessages(targetPeer, messageIds, { revoke: true });
      deleted = true;
    } catch (err) {
      console.warn("Lỗi xóa file qua MTProto:", err);
    }
  }

  // Xóa khỏi cache IndexedDB
  for (const mId of messageIds) {
    await removeFileFromCache(mId);
  }

  return deleted;
}
