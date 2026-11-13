/**
 * uploadService.ts - Dịch vụ chọn ảnh từ máy iPhone và upload lên Kênh Telegram
 */

import { initTelegramClient, autoDetectChannel, saveStoredConfig } from "./telegramClient";
import { savePhotoToCache } from "./photoStorage";
import type { TelegramConfig, PhotoItem } from "../types";
import { Buffer } from "buffer";

export interface UploadProgress {
  total: number;
  current: number;
  percent: number;
  currentFileName: string;
}

/**
 * Nén ảnh nhẹ nhàng để làm thumbnail hiển thị cục bộ mượt mà
 */
async function createThumbnail(file: File, maxDim = 800): Promise<ArrayBuffer> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let { width, height } = img;
        if (width > height) {
          if (width > maxDim) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          }
        } else {
          if (height > maxDim) {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          canvas.toBlob(
            async (blob) => {
              if (blob) {
                const buffer = await blob.arrayBuffer();
                resolve(buffer);
              } else {
                const fallback = await file.arrayBuffer();
                resolve(fallback);
              }
            },
            "image/jpeg",
            0.82
          );
        } else {
          file.arrayBuffer().then(resolve);
        }
      };
      img.onerror = () => {
        file.arrayBuffer().then(resolve);
      };
      img.src = e.target?.result as string;
    };
    reader.onerror = () => {
      file.arrayBuffer().then(resolve);
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Upload danh sách file lên Kênh Telegram
 */
export async function uploadPhotosToTelegram(
  config: TelegramConfig,
  files: File[],
  onProgress?: (p: UploadProgress) => void
): Promise<PhotoItem[]> {
  const client = await initTelegramClient(config);

  // 1. Tự động tìm Channel ID nếu chưa có
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
    throw new Error(
      "Không tìm thấy Kênh lưu trữ. Vui lòng vào Cài đặt để kết nối kênh hoặc tạo kênh 'Kho ảnh đồng bộ Telegram'!"
    );
  }

  // 2. Tìm entity peer chính xác bằng getDialogs hoặc getEntity
  let targetPeer: any = null;
  try {
    const dialogs: any = await client.getDialogs({ limit: 100 });
    const found = dialogs.find(
      (d: any) =>
        d.id?.toString() === channelId ||
        d.entity?.id?.toString() === channelId ||
        (d.title || d.name || "").toLowerCase().includes("kho ảnh đồng bộ")
    );
    if (found && found.entity) {
      targetPeer = found.entity;
    }
  } catch (e) {
    console.warn("Không thể quét getDialogs khi chuẩn bị upload:", e);
  }

  if (!targetPeer) {
    try {
      targetPeer = await client.getEntity(channelId);
    } catch {
      try {
        targetPeer = await client.getEntity(BigInt(channelId));
      } catch {
        targetPeer = channelId;
      }
    }
  }

  const { CustomFile } = await import("telegram/client/uploads");
  const uploadedPhotos: PhotoItem[] = [];
  const total = files.length;
  let lastError: Error | null = null;

  for (let i = 0; i < total; i++) {
    const file = files[i];
    if (onProgress) {
      onProgress({
        total,
        current: i + 1,
        percent: Math.round(((i + 1) / total) * 100),
        currentFileName: file.name,
      });
    }

    try {
      // 1. Tạo thumbnail nhanh cho hiển thị cục bộ
      const thumbBuffer = await createThumbnail(file);

      // 2. Lấy thời gian chụp/chỉnh sửa thực tế của file ảnh
      const fileDate = file.lastModified ? new Date(file.lastModified) : new Date();
      const captionText = `📷 ${file.name}\n📅 ${fileDate.toLocaleDateString("vi-VN")}`;

      // 3. Upload file lên Kênh Telegram qua MTProto
      // Đọc arrayBuffer và bọc vào CustomFile có Buffer hợp lệ của GramJS
      const rawBuffer = await file.arrayBuffer();
      const nodeBuffer = Buffer.from(rawBuffer);
      const customFile = new CustomFile(
        file.name,
        file.size || rawBuffer.byteLength,
        "",
        nodeBuffer
      );

      // Upload trực tiếp với workers: 1 đảm bảo độ ổn định cao trên iPhone
      const sentMessage: any = await client.sendFile(targetPeer, {
        file: customFile,
        caption: captionText,
        workers: 1,
      });

      const messageId = sentMessage?.id || Date.now();

      // 4. Lưu ngay thumbnail và ảnh gốc vào IndexedDB cục bộ của máy
      await savePhotoToCache({
        messageId,
        id: `tg-${messageId}`,
        thumbnailData: thumbBuffer,
        hdData: rawBuffer,
        caption: file.name,
        timestamp: fileDate.getTime(),
        isCarousel: false,
      });

      const blob = new Blob([thumbBuffer], { type: "image/jpeg" });
      const url = URL.createObjectURL(blob);

      uploadedPhotos.push({
        id: `tg-${messageId}`,
        messageId,
        url,
        thumbnailUrl: url,
        caption: file.name,
        date: fileDate,
        isCarousel: false,
      });
    } catch (err: any) {
      console.error(`Lỗi upload file ${file.name}:`, err);
      lastError = err;
    }
  }

  if (uploadedPhotos.length === 0 && lastError) {
    throw lastError;
  }

  return uploadedPhotos;
}
