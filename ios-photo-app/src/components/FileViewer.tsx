/**
 * FileViewer.tsx - Trình xem trước, phát media và tải tệp tin toàn diện
 */

import React, { useState, useEffect } from "react";
import type { CloudFile, TelegramConfig } from "../types";
import { FileIcon } from "./FileIcon";
import { downloadTelegramFile } from "../services/telegramDriveService";
import {
  ChevronLeft,
  Share2,
  Download,
  Trash2,
  Star,
  RefreshCw,
  Folder,
  Calendar,
  HardDrive,
  ZoomIn,
  ZoomOut,
  Play,
} from "lucide-react";

interface FileViewerProps {
  file: CloudFile | null;
  config: TelegramConfig;
  onClose: () => void;
  onToggleStar: (messageId: number) => void;
  onDeleteFile: (file: CloudFile) => void;
  showToast: (msg: string) => void;
}

export const FileViewer: React.FC<FileViewerProps> = ({
  file,
  config,
  onClose,
  onToggleStar,
  onDeleteFile,
  showToast,
}) => {
  const [downloadProgress, setDownloadProgress] = useState<number | null>(null);
  const [downloadedUrl, setDownloadedUrl] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    setScale(1);
    setDownloadedUrl(null);
    setDownloadProgress(null);
    setIsDownloading(false);
  }, [file?.messageId]);

  if (!file) return null;

  // Xử lý tải và mở tệp qua iOS Share Sheet (Lưu vào Tệp / Mở bằng ứng dụng khác)
  const handleDownloadAndShare = async () => {
    if (isDownloading) return;
    setIsDownloading(true);
    setDownloadProgress(0);
    showToast(`Đang tải ${file.name}...`);

    try {
      const res = await downloadTelegramFile(config, file.messageId, (p) => {
        setDownloadProgress(p);
      });

      const fileObj = new File([res.blob], file.name, { type: res.mimeType });
      const localUrl = URL.createObjectURL(res.blob);
      setDownloadedUrl(localUrl);

      // Cách 1: Chia sẻ trực tiếp qua Web Share API File (Menu Lưu vào Tệp của iOS)
      if (navigator.canShare && navigator.canShare({ files: [fileObj] })) {
        await navigator.share({
          files: [fileObj],
          title: file.name,
        });
        showToast("👉 Chọn 'Lưu vào Tệp' (Files) để lưu trên iPhone!");
        return;
      }

      // Cách 2: Tải trình duyệt dự phòng
      const a = document.createElement("a");
      a.href = localUrl;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      showToast("Đã tải tệp về máy thành công!");
    } catch (err: any) {
      console.error("Lỗi tải tệp:", err);
      showToast("Lỗi khi tải tệp: " + (err.message || "Thử lại sau"));
    } finally {
      setIsDownloading(false);
      setDownloadProgress(null);
    }
  };

  const handleToggleZoom = () => {
    if (file.category !== "image") return;
    setScale((prev) => (prev === 1 ? 2.5 : 1));
  };

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col justify-between select-none overflow-hidden animate-in fade-in duration-200">
      {/* Top Header Bar */}
      <div className="pt-[var(--sat)] h-16 px-4 flex items-center justify-between bg-neutral-950/80 backdrop-blur-md border-b border-neutral-800/60 z-20">
        <button
          onClick={onClose}
          className="flex items-center text-blue-400 active:opacity-60 text-sm font-semibold -ml-1 py-2 pr-3"
        >
          <ChevronLeft className="w-5 h-5 mr-0.5" />
          <span>Tệp</span>
        </button>

        <p className="text-xs sm:text-sm font-bold text-white truncate max-w-[200px] sm:max-w-xs text-center">
          {file.name}
        </p>

        <button
          onClick={handleDownloadAndShare}
          className="w-8 h-8 rounded-full bg-neutral-800/80 flex items-center justify-center text-blue-400 active:opacity-60"
          title="Chia sẻ tệp"
        >
          <Share2 className="w-4 h-4" />
        </button>
      </div>

      {/* Main Center Content Container */}
      <div className="flex-1 overflow-y-auto flex items-center justify-center p-4">
        {/* Trường hợp 1: Hình ảnh */}
        {file.category === "image" ? (
          <div
            onClick={handleToggleZoom}
            className="w-full h-full flex items-center justify-center overflow-hidden cursor-zoom-in"
          >
            <img
              src={downloadedUrl || file.thumbnailUrl || file.url}
              alt={file.name}
              style={{
                transform: `scale(${scale})`,
                transition: "transform 0.25s ease-out",
              }}
              className="max-w-full max-h-[75vh] object-contain rounded-2xl shadow-2xl"
            />
          </div>
        ) : file.category === "video" ? (
          /* Trường hợp 2: Video */
          <div className="w-full h-full flex items-center justify-center">
            <video
              src={downloadedUrl || file.url}
              controls
              playsInline
              autoPlay
              className="max-w-full max-h-[75vh] rounded-2xl shadow-2xl bg-black"
            />
          </div>
        ) : file.category === "audio" ? (
          /* Trường hợp 3: Audio / Nhạc */
          <div className="w-full max-w-sm bg-neutral-900 border border-neutral-800 rounded-3xl p-6 text-center space-y-4 shadow-2xl">
            <div className="flex justify-center">
              <FileIcon file={file} size="xl" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white truncate">{file.name}</h3>
              <p className="text-xs text-neutral-400 mt-1">{file.sizeFormatted}</p>
            </div>
            {downloadedUrl ? (
              <audio src={downloadedUrl} controls className="w-full" autoPlay />
            ) : (
              <button
                onClick={handleDownloadAndShare}
                disabled={isDownloading}
                className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 active:scale-98 transition-all"
              >
                {isDownloading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-white" />}
                <span>{isDownloading ? `Đang tải (${downloadProgress || 0}%)...` : "Phát âm thanh"}</span>
              </button>
            )}
          </div>
        ) : (
          /* Trường hợp 4: Tài liệu, File nén, Cài đặt, Code, File khác */
          <div className="w-full max-w-sm bg-neutral-900/90 border border-neutral-800/90 backdrop-blur-xl rounded-3xl p-6 text-center space-y-5 shadow-2xl">
            <div className="flex justify-center">
              <FileIcon file={file} size="xl" />
            </div>

            <div>
              <h3 className="text-sm sm:text-base font-bold text-white break-words">
                {file.name}
              </h3>
              <p className="text-xs text-blue-400 font-semibold mt-1">
                {file.sizeFormatted} • {file.extension.toUpperCase() || "TỆP"}
              </p>
            </div>

            {/* Thông số chi tiết */}
            <div className="bg-neutral-800/50 border border-neutral-800 rounded-2xl p-3 text-left space-y-2 text-xs">
              <div className="flex items-center justify-between text-neutral-400">
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Ngày tải lên</span>
                </span>
                <span className="text-white font-medium">
                  {file.date.toLocaleDateString("vi-VN", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </span>
              </div>

              {file.folder && file.folder !== "/" && (
                <div className="flex items-center justify-between text-neutral-400 pt-1 border-t border-neutral-800/60">
                  <span className="flex items-center gap-1.5">
                    <Folder className="w-3.5 h-3.5" />
                    <span>Thư mục</span>
                  </span>
                  <span className="text-white font-medium">{file.folder}</span>
                </div>
              )}

              <div className="flex items-center justify-between text-neutral-400 pt-1 border-t border-neutral-800/60">
                <span className="flex items-center gap-1.5">
                  <HardDrive className="w-3.5 h-3.5" />
                  <span>Mã tin nhắn Kênh</span>
                </span>
                <span className="font-mono text-neutral-300">#{file.messageId}</span>
              </div>
            </div>

            {/* Nút Tải về & Mở trong Tệp (Files) */}
            <button
              onClick={handleDownloadAndShare}
              disabled={isDownloading}
              className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 active:scale-98 text-white font-bold rounded-2xl text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25 transition-all disabled:opacity-60"
            >
              {isDownloading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Đang tải xuống ({downloadProgress || 0}%)...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Lưu vào Tệp / Mở ứng dụng</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Bottom Action Bar */}
      <div className="pb-[var(--sab)] h-20 px-8 flex items-center justify-between bg-neutral-950/80 backdrop-blur-md border-t border-neutral-800/60 z-20">
        {/* Nút Đánh dấu sao */}
        <button
          onClick={() => onToggleStar(file.messageId)}
          className={`p-2 transition-transform active:scale-125 ${
            file.isStarred ? "text-amber-400" : "text-neutral-400"
          }`}
          title="Đánh dấu sao"
        >
          <Star className={`w-6 h-6 ${file.isStarred ? "fill-amber-400" : ""}`} />
        </button>

        {/* Nút Phóng to nếu là ảnh */}
        {file.category === "image" && (
          <button
            onClick={handleToggleZoom}
            className="p-2 text-neutral-300 active:scale-125 transition-transform"
            title="Phóng to ảnh"
          >
            {scale > 1 ? <ZoomOut className="w-6 h-6 text-blue-400" /> : <ZoomIn className="w-6 h-6" />}
          </button>
        )}

        {/* Nút Tải về */}
        <button
          onClick={handleDownloadAndShare}
          disabled={isDownloading}
          className="p-2 text-neutral-300 active:opacity-60"
          title="Tải tệp về máy"
        >
          {isDownloading ? <RefreshCw className="w-6 h-6 animate-spin text-blue-400" /> : <Download className="w-6 h-6" />}
        </button>

        {/* Nút Xóa tệp */}
        <button
          onClick={() => onDeleteFile(file)}
          className="p-2 text-neutral-400 hover:text-red-400 active:text-red-500 transition-colors"
          title="Xóa tệp khỏi Kênh"
        >
          <Trash2 className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
};
