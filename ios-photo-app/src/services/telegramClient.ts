import type { PhotoItem, TelegramConfig } from "../types";
import {
  getCachedPhotosFromDB,
  getCachedMessageIds,
  savePhotoToCache,
  getCachedHdPhoto,
  saveHdPhotoToCache,
} from "./photoStorage";

// Khóa lưu cấu hình trong LocalStorage
const CONFIG_STORAGE_KEY = "cloud_photos_tg_config";

export const DEFAULT_CONFIG: TelegramConfig = {
  apiId: localStorage.getItem("tg_api_id") || "",
  apiHash: localStorage.getItem("tg_api_hash") || "",
  botToken: "9259768287:AAHtvb_axOPOWrbHznw1tdok92gHjLqxY-U",
  channelId: localStorage.getItem("cloud_photos_channel_id") || "",
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
}

/**
 * Dữ liệu mẫu (Sample Data) hiển thị khi chưa điền API_ID/API_HASH từ my.telegram.org
 */
export const SAMPLE_PHOTOS: PhotoItem[] = [
  {
    id: "sample-1",
    messageId: 101,
    url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=1200&q=85",
    thumbnailUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80",
    author: "vyvy.babieeeew",
    caption: "at night ✨ (Instagram HD)",
    originalUrl: "https://www.instagram.com/p/Dfms9w1k4x6/",
    groupedId: "sample-carousel-1",
    date: new Date(),
    isCarousel: true,
    carouselIndex: 1,
    totalInCarousel: 3,
  },
  {
    id: "sample-2",
    messageId: 102,
    url: "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=1200&q=85",
    thumbnailUrl: "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=400&q=80",
    author: "vyvy.babieeeew",
    caption: "at night (slide 2)",
    originalUrl: "https://www.instagram.com/p/Dfms9w1k4x6/",
    groupedId: "sample-carousel-1",
    date: new Date(),
    isCarousel: true,
    carouselIndex: 2,
    totalInCarousel: 3,
  },
  {
    id: "sample-3",
    messageId: 103,
    url: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=1200&q=85",
    thumbnailUrl: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=400&q=80",
    author: "vyvy.babieeeew",
    caption: "at night (slide 3)",
    originalUrl: "https://www.instagram.com/p/Dfms9w1k4x6/",
    groupedId: "sample-carousel-1",
    date: new Date(),
    isCarousel: true,
    carouselIndex: 3,
    totalInCarousel: 3,
  },
  {
    id: "sample-4",
    messageId: 104,
    url: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=85",
    thumbnailUrl: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=400&q=80",
    author: "natgeo",
    caption: "Majestic nature photography from Yosemite Valley.",
    originalUrl: "https://www.instagram.com/p/C4iW3Q_r_gV/",
    date: new Date(Date.now() - 86400000), // Hôm qua
    isCarousel: false,
  },
  {
    id: "sample-5",
    messageId: 105,
    url: "https://images.unsplash.com/photo-1511765224389-37f0e77cf0eb?auto=format&fit=crop&w=1200&q=85",
    thumbnailUrl: "https://images.unsplash.com/photo-1511765224389-37f0e77cf0eb?auto=format&fit=crop&w=400&q=80",
    author: "travel.gram",
    caption: "Sunset over the coastal cliff edge.",
    originalUrl: "https://www.instagram.com/",
    date: new Date(Date.now() - 86400000 * 2), // 2 ngày trước
    isCarousel: false,
  },
  {
    id: "sample-6",
    messageId: 106,
    url: "https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?auto=format&fit=crop&w=1200&q=85",
    thumbnailUrl: "https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?auto=format&fit=crop&w=400&q=80",
    author: "street.photography",
    caption: "Rainy streets reflection.",
    originalUrl: "https://www.instagram.com/",
    date: new Date(Date.now() - 86400000 * 3),
    isCarousel: false,
  },
];

let globalClient: any = null;

/**
 * Khởi tạo MTProto Client qua GramJS
 */
export async function initTelegramClient(config: TelegramConfig): Promise<any> {
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
      await client.start({
        botAuthToken: config.botToken,
      });
    } catch (e) {
      console.warn("Khởi động bot token MTProto:", e);
    }
  }

  globalClient = client;
  return client;
}

/**
 * Gửi mã xác nhận Telegram về điện thoại (MTProto Login)
 */
export async function requestTelegramCode(
  apiId: string,
  apiHash: string,
  phoneNumber: string
): Promise<{ phoneCodeHash: string }> {
  const { TelegramClient } = await import("telegram");
  const { StringSession } = await import("telegram/sessions");

  const client = new TelegramClient(
    new StringSession(""),
    parseInt(apiId, 10),
    apiHash,
    { connectionRetries: 5, useWSS: true }
  );

  await client.connect();
  const res = await client.sendCode(
    {
      apiId: parseInt(apiId, 10),
      apiHash,
    },
    phoneNumber
  );

  globalClient = client;
  return { phoneCodeHash: res.phoneCodeHash };
}

/**
 * Xác thực mã đăng nhập và lưu phiên (Session)
 */
export async function verifyTelegramCode(
  phoneNumber: string,
  phoneCodeHash: string,
  code: string,
  password?: string
): Promise<string> {
  if (!globalClient) {
    throw new Error("Client chưa khởi tạo");
  }

  const { Api } = await import("telegram");

  try {
    await globalClient.invoke(
      new Api.auth.SignIn({
        phoneNumber,
        phoneCodeHash,
        phoneCode: code,
      })
    );
  } catch (err: any) {
    if (err.errorMessage === "SESSION_PASSWORD_NEEDED" && password) {
      await globalClient.signInWithPassword({
        password: async () => password,
      });
    } else {
      throw err;
    }
  }

  const sessionString = globalClient.session.save();
  localStorage.setItem("tg_session", sessionString);
  return sessionString;
}

/**
 * Đăng xuất Telegram
 */
export async function logoutTelegram(): Promise<void> {
  if (globalClient) {
    try {
      await globalClient.disconnect();
    } catch {}
    globalClient = null;
  }
  localStorage.removeItem("tg_session");
}

/**
 * Tự động tìm kiếm Kênh có tên "Kho ảnh đồng bộ Telegram" trong danh sách chat của tài khoản
 */
export async function autoDetectChannel(
  config: TelegramConfig
): Promise<{ id: string; title: string } | null> {
  try {
    const client = await initTelegramClient(config);
    const dialogs: any = await client.getDialogs({});
    for (const d of dialogs) {
      const title = (d.title || d.name || "").toLowerCase();
      if (
        title.includes("kho ảnh đồng bộ") ||
        title.includes("đồng bộ telegram") ||
        title.includes("cloud photos")
      ) {
        const id = d.id?.toString();
        if (id) {
          return { id, title: d.title || d.name };
        }
      }
    }
  } catch (err) {
    console.warn("Không thể quét danh sách kênh tự động:", err);
  }
  return null;
}

/**
 * Lấy danh sách ảnh trực tiếp từ Kênh Telegram với hỗ trợ IndexedDB Persistent Cache
 */
export async function fetchChannelPhotos(
  config: TelegramConfig,
  limit: number = 80
): Promise<PhotoItem[]> {
  if (!config.apiId || !config.apiHash) {
    return SAMPLE_PHOTOS;
  }

  if (!config.sessionString && !config.isLoggedIn) {
    throw new Error(
      "CHUA_DANG_NHAP: Bạn cần đăng nhập tài khoản Telegram bằng số điện thoại để đọc ảnh từ Kênh lưu trữ."
    );
  }

  try {
    const client = await initTelegramClient(config);

    // Tự động tìm Kênh "Kho ảnh đồng bộ Telegram" nếu chưa có channelId
    let channelId = config.channelId;
    if (!channelId) {
      const detected = await autoDetectChannel(config);
      if (detected) {
        channelId = detected.id;
        config.channelId = detected.id;
        saveStoredConfig(config);
      }
    }

    if (!channelId) {
      const fallbackPhotos = await getCachedPhotosFromDB();
      return fallbackPhotos;
    }

    let targetPeer: any = channelId;
    try {
      targetPeer = await client.getEntity(channelId);
    } catch {
      try {
        targetPeer = await client.getEntity(BigInt(channelId));
      } catch {
        targetPeer = channelId;
      }
    }

    // 1. Kiểm tra danh sách messageId đã lưu trong IndexedDB máy
    const cachedIds = await getCachedMessageIds();

    // 2. Lấy danh sách tin nhắn mới từ Telegram
    const messages = await client.getMessages(targetPeer, { limit });

    // 3. Tải thumbnail CHO CÁC TIN NHẮN MỚI CHƯA CÓ TRONG CACHE
    for (const msg of messages) {
      if (!msg.media) continue;
      const isPhoto = !!msg.media.photo;
      const isDoc = !!msg.media.document;
      if (!isPhoto && !isDoc) continue;

      // Nếu đã có trong IndexedDB, bỏ qua không tải lại
      if (cachedIds.has(msg.id)) continue;

      try {
        // Tải thumbnail sắc nét (thumb: 2 ~800px) cho Retina màn hình iPhone
        const buffer = await client.downloadMedia(msg.media, { thumb: 2 });
        if (buffer) {
          await savePhotoToCache({
            messageId: msg.id,
            id: `tg-${msg.id}`,
            thumbnailData: buffer,
            caption: msg.message || "",
            timestamp: msg.date * 1000,
            isCarousel: msg.groupedId != null,
          });
          cachedIds.add(msg.id);
        }
      } catch (e) {
        console.warn(`Lỗi tải media tin nhắn ${msg.id}:`, e);
      }
    }

    // 4. Trả về toàn bộ ảnh từ IndexedDB (cực kỳ nhanh, đúng thứ tự)
    const allPhotos = await getCachedPhotosFromDB();
    return allPhotos;
  } catch (error: any) {
    console.error("Lỗi kết nối Telegram MTProto:", error);
    // Nếu gặp lỗi mạng, trả về ảnh đã có trong IndexedDB để người dùng vẫn xem được
    const fallbackPhotos = await getCachedPhotosFromDB();
    if (fallbackPhotos.length > 0) {
      return fallbackPhotos;
    }
    throw error;
  }
}

/**
 * Tải ảnh gốc độ phân giải cao nhất (HD Full Resolution) từ Telegram CDN hoặc IndexedDB
 */
export async function fetchFullResolutionPhoto(
  config: TelegramConfig,
  messageId: number
): Promise<string | null> {
  // 1. Kiểm tra cache IndexedDB trước (mở tức thì)
  const cachedHd = await getCachedHdPhoto(messageId);
  if (cachedHd) {
    return cachedHd;
  }

  try {
    const client = await initTelegramClient(config);
    let targetPeer: any = config.channelId;
    try {
      targetPeer = await client.getEntity(config.channelId);
    } catch {
      targetPeer = config.channelId;
    }

    const messages = await client.getMessages(targetPeer, { ids: [messageId] });
    if (messages && messages[0] && messages[0].media) {
      // Tải ảnh nguyên bản không nén (100% gốc HD/4K)
      const buffer = await client.downloadMedia(messages[0].media);
      if (buffer) {
        const hdUrl = await saveHdPhotoToCache(messageId, buffer);
        return hdUrl;
      }
    }
  } catch (err) {
    console.warn(`Lỗi tải ảnh gốc tin nhắn ${messageId}:`, err);
  }
  return null;
}

/**
 * Gửi liên kết Instagram đến Kênh lưu trữ qua Telegram MTProto
 */
export async function sendInstagramLinkToChannel(
  config: TelegramConfig,
  url: string
): Promise<boolean> {
  const client = await initTelegramClient(config);
  let targetPeer: any = config.channelId;
  try {
    targetPeer = await client.getEntity(config.channelId);
  } catch {
    try {
      targetPeer = await client.getEntity(BigInt(config.channelId));
    } catch {
      targetPeer = config.channelId;
    }
  }

  await client.sendMessage(targetPeer, { message: url.trim() });
  return true;
}

/**
 * Xóa tin nhắn ảnh vĩnh viễn trên Kênh Telegram
 */
export async function deleteTelegramPhoto(
  config: TelegramConfig,
  messageId: number
): Promise<boolean> {
  let deleted = false;

  // Cách 1: Sử dụng MTProto Client với phiên đăng nhập người dùng
  if (config.sessionString || config.isLoggedIn) {
    try {
      const client = await initTelegramClient(config);
      let targetPeer: any = config.channelId;
      try {
        targetPeer = await client.getEntity(config.channelId);
      } catch {
        try {
          targetPeer = await client.getEntity(BigInt(config.channelId));
        } catch {
          targetPeer = config.channelId;
        }
      }

      await client.deleteMessages(targetPeer, [messageId], { revoke: true });
      deleted = true;
    } catch (err) {
      console.warn("Lỗi xóa ảnh qua MTProto:", err);
    }
  }

  // Cách 2: Dự phòng qua Telegram Bot API (nếu có botToken)
  if (!deleted && config.botToken && config.channelId) {
    try {
      const res = await fetch(
        `https://api.telegram.org/bot${config.botToken}/deleteMessage?chat_id=${config.channelId}&message_id=${messageId}`
      );
      const json = await res.json();
      if (json && json.ok) {
        deleted = true;
      }
    } catch (err) {
      console.warn("Lỗi xóa ảnh qua Bot API:", err);
    }
  }

  return deleted;
}
