/**
 * types/index.ts - Định nghĩa dữ liệu cho Telegram Cloud Drive (TeleDrive)
 */

export type FileCategory =
  | "document"
  | "image"
  | "video"
  | "audio"
  | "archive"
  | "app"
  | "code"
  | "other";

export interface CloudFile {
  id: string; // `tg-${messageId}`
  messageId: number;
  name: string; // e.g. "BaoCao.docx", "HinhAnh.png", "App.ipa"
  size: number; // size in bytes
  sizeFormatted: string; // e.g. "15.4 MB", "1.2 GB"
  mimeType: string; // e.g. "application/pdf"
  extension: string; // e.g. "pdf", "zip", "docx"
  category: FileCategory;
  date: Date;
  folder?: string; // Tên thư mục hoặc "/"
  thumbnailUrl?: string; // Blob URL cho preview ảnh/video
  url?: string; // Direct hoặc Blob URL
  caption?: string; // Nội dung chú thích tin nhắn
  isStarred?: boolean; // Được đánh dấu sao (yêu thích)
  author?: string;
  isVideo?: boolean;
  isCarousel?: boolean;
  originalUrl?: string;
}

export interface FolderItem {
  id: string;
  name: string;
  path: string;
  fileCount: number;
  totalSize: number;
  totalSizeFormatted: string;
  createdAt: number;
  color?: string;
}

export interface TransferTask {
  id: string;
  name: string;
  size: number;
  sizeFormatted: string;
  type: "upload" | "download";
  status: "pending" | "running" | "completed" | "error";
  progress: number; // 0 - 100
  speed?: string; // e.g. "3.5 MB/s"
  error?: string;
  createdAt: number;
}

export interface DriveStats {
  totalFiles: number;
  totalSizeBytes: number;
  totalSizeFormatted: string;
  documentsCount: number;
  mediaCount: number;
  archivesCount: number;
  appsCount: number;
  othersCount: number;
}

export interface TelegramConfig {
  apiId: string;
  apiHash: string;
  botToken: string;
  channelId: string;
  channelTitle?: string;
  phoneNumber?: string;
  sessionString?: string;
  isLoggedIn?: boolean;
}

export type ThemeMode = "dark" | "light" | "system";

// Tương thích ngược cho các module cũ
export interface PhotoItem {
  id: string | number;
  messageId: number;
  url: string;
  thumbnailUrl?: string;
  width?: number;
  height?: number;
  caption?: string;
  author?: string;
  originalUrl?: string;
  groupedId?: string;
  date: Date;
  isCarousel?: boolean;
  isVideo?: boolean;
  videoDuration?: number;
  carouselIndex?: number;
  totalInCarousel?: number;
  carouselItems?: PhotoItem[];
}

export interface DateGroup {
  dateTitle: string;
  photos: PhotoItem[];
}

export interface PostAlbum {
  id: string;
  title: string;
  originalUrl?: string;
  author: string;
  date: Date;
  coverPhoto: PhotoItem;
  photos: PhotoItem[];
}

export interface UserAlbum {
  id: string;
  title: string;
  createdAt: number;
  coverPhotoUrl?: string;
  coverPhotoId?: string | number;
  photoIds: (string | number)[];
}
