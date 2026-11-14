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
 * Trích xuất frame hình ảnh đầu tiên của video để làm thumbnail sắc nét
 */
async function createVideoThumbnail(file: File, maxDim = 800): Promise<ArrayBuffer> {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.muted = true;
    video.playsInline = true;
    const url = URL.createObjectURL(file);
    video.src = url;

    let hasResolved = false;
    const finish = async (buf: ArrayBuffer) => {
      if (!hasResolved) {
        hasResolved = true;
        URL.revokeObjectURL(url);
        resolve(buf);
      }
    };

    const timeoutId = setTimeout(() => {
      finish(new ArrayBuffer(0));
    }, 6000);

    video.onloadeddata = () => {
      video.currentTime = Math.min(0.5, video.duration || 0);
    };

    video.onseeked = () => {
      clearTimeout(timeoutId);
      const canvas = document.createElement("canvas");
      let width = video.videoWidth || 640;
      let height = video.videoHeight || 360;
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
        ctx.drawImage(video, 0, 0, width, height);
        canvas.toBlob(
          async (blob) => {
            if (blob) finish(await blob.arrayBuffer());
            else finish(new ArrayBuffer(0));
          },
          "image/jpeg",
          0.85
        );
      } else {
        finish(new ArrayBuffer(0));
      }
    };

    video.onerror = () => {
      clearTimeout(timeoutId);
      finish(new ArrayBuffer(0));
    };
  });
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
      const isVideo = file.type.startsWith("video/") || /\.(mp4|mov|m4v|webm)$/i.test(file.name);

      // 1. Tạo thumbnail nhanh cho hiển thị cục bộ (Hỗ trợ cả Video và Ảnh)
      const thumbBuffer = isVideo
        ? await createVideoThumbnail(file)
        : await createThumbnail(file);

      // 2. Lấy thời gian chụp/chỉnh sửa thực tế của file ảnh (bảo lưu ngày tháng gốc)
      const fileDate = file.lastModified && file.lastModified > 0 ? new Date(file.lastModified) : new Date();
      const dateStr = fileDate.toLocaleDateString("vi-VN");
      const isoDate = fileDate.toISOString().split("T")[0]; // YYYY-MM-DD
      const iconTag = isVideo ? "🎥" : "📷";
      const captionText = `${iconTag} ${file.name}\n📅 ${dateStr} [${isoDate}]`;

      // 3. Upload file lên Kênh Telegram qua MTProto
      // Đọc arrayBuffer và bọc vào CustomFile có Buffer hợp lệ của GramJS
      const rawBuffer = await file.arrayBuffer();
      const nodeBuffer = Buffer.from(rawBuffer);
      const fileSize = rawBuffer.byteLength;
      const customFile = new CustomFile(
        file.name,
        fileSize,
        file.name,
        nodeBuffer
      );

      // Upload file qua client.uploadFile với maxBufferSize = 2GB
      // Ngăn ngừa triệt để lỗi 'Either one of `buffer` or `filePath` should be specified'
      // vốn xảy ra trên WebKit/Capacitor khi video hoặc ảnh vượt quá 20MB
      const fileHandle = await client.uploadFile({
        file: customFile,
        workers: 1,
        maxBufferSize: 2 * 1024 * 1024 * 1024,
        onProgress: (percent: number) => {
          if (onProgress) {
            onProgress({
              total,
              current: i + 1,
              percent: Math.round(((i + percent) / total) * 100),
              currentFileName: file.name,
            });
          }
        },
      });

      // Gửi message lên Telegram bằng fileHandle đã upload
      const sentMessage: any = await client.sendFile(targetPeer, {
        file: fileHandle,
        caption: captionText,
        forceDocument: false,
        workers: 1,
        supportsStreaming: isVideo,
      });

      const messageId = sentMessage?.id || Date.now();

      // 4. Lưu ngay thumbnail và dữ liệu gốc vào IndexedDB cục bộ của máy
      const validThumb = thumbBuffer && thumbBuffer.byteLength >= 100 ? thumbBuffer : (isVideo ? undefined : rawBuffer);
      await savePhotoToCache({
        messageId,
        id: `tg-${messageId}`,
        thumbnailData: (validThumb || rawBuffer) as ArrayBuffer,
        hdData: rawBuffer,
        caption: file.name,
        timestamp: fileDate.getTime(),
        isCarousel: false,
        isVideo,
      });

      const thumbBlob = validThumb
        ? new Blob([validThumb], { type: "image/jpeg" })
        : new Blob([rawBuffer], { type: file.type || "image/jpeg" });
      const thumbUrl = URL.createObjectURL(thumbBlob);

      const hdBlob = new Blob([rawBuffer], { type: isVideo ? (file.type || "video/mp4") : (file.type || "image/jpeg") });
      const mediaUrl = URL.createObjectURL(hdBlob);

      uploadedPhotos.push({
        id: `tg-${messageId}`,
        messageId,
        url: mediaUrl,
        thumbnailUrl: thumbUrl,
        caption: file.name,
        date: fileDate,
        isCarousel: false,
        isVideo,
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
