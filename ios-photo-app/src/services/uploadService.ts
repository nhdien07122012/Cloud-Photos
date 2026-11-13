/**
 * uploadService.ts - Dịch vụ chọn ảnh từ máy iPhone và upload lên Kênh Telegram
 */

import { initTelegramClient } from "./telegramClient";
import { savePhotoToCache } from "./photoStorage";
import type { TelegramConfig, PhotoItem } from "../types";

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

  const uploadedPhotos: PhotoItem[] = [];
  const total = files.length;

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
      // 1. Tạo thumbnail nhanh
      const thumbBuffer = await createThumbnail(file);

      // 2. Lấy thời gian chụp/chỉnh sửa thực tế của file ảnh
      const fileDate = file.lastModified ? new Date(file.lastModified) : new Date();
      const captionText = `📷 ${file.name}\n📅 ${fileDate.toLocaleDateString("vi-VN")}`;

      // 3. Upload file lên Kênh Telegram qua MTProto
      // Chuyển File sang CustomFile cho GramJS
      const buffer = await file.arrayBuffer();
      const uint8 = new Uint8Array(buffer);
      
      // Upload trực tiếp
      const sentMessage: any = await client.sendFile(targetPeer, {
        file: uint8,
        caption: captionText,
        workers: 2,
      });

      const messageId = sentMessage?.id || Date.now();

      // 4. Lưu ngay vào IndexedDB cục bộ của máy
      await savePhotoToCache({
        messageId,
        id: `tg-${messageId}`,
        thumbnailData: thumbBuffer,
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
    } catch (err) {
      console.error(`Lỗi upload file ${file.name}:`, err);
    }
  }

  return uploadedPhotos;
}
