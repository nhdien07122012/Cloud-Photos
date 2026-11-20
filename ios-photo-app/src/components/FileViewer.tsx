/**
 * FileViewer.tsx - Trình xem trước, phát media và tải tệp tin toàn diện
 */

import React, { useState, useEffect } from "react";
import type { CloudFile, TelegramConfig } from "../types";
import { FileIcon } from "./FileIcon";
import { downloadTelegramFile } from "../services/telegramDriveService";
import { getCachedFileData } from "../services/fileStorage";
import {
  ChevronLeft,
  Share2,
  Trash2,
  Star,
  RefreshCw,
  Folder,
  Calendar,
  HardDrive,
  ZoomIn,
  ZoomOut,
  Play,
  DownloadCloud,
  CheckCircle2,
} from "lucide-react";

interface FileViewerProps {
  file: CloudFile | null;
  config: TelegramConfig;
  onClose: () => void;
  onToggleStar: (messageId: number) => void;
  onDeleteFile: (file: CloudFile) => void;
  showToast: (msg: string) => void;
  isCached?: boolean;
  onDownloadToApp?: (file: CloudFile) => void;
}

export const FileViewer: React.FC<FileViewerProps> = ({
  file,
  config,
  onClose,
  onToggleStar,
  onDeleteFile,
  showToast,
  isCached = false,
  onDownloadToApp,
}) => {
  const [downloadProgress, setDownloadProgress] = useState<number | null>(null);
  const [downloadSpeed, setDownloadSpeed] = useState<string | null>(null);
  const [downloadedUrl, setDownloadedUrl] = useState<string | null>(null);
  const [isLocallyCached, setIsLocallyCached] = useState<boolean>(isCached);
  const [isDownloading, setIsDownloading] = useState(false);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    setScale(1);
    setDownloadProgress(null);
    setDownloadSpeed(null);
    setIsDownloading(false);

    if (file?.messageId) {
      getCachedFileData(file.messageId).then((data) => {
        if (data && data.byteLength > 0) {
          const url = URL.createObjectURL(new Blob([data], { type: file.mimeType }));
          setDownloadedUrl(url);
          setIsLocallyCached(true);
        } else {
          setDownloadedUrl(null);
          setIsLocallyCached(isCached);
        }
      });
    }
  }, [file?.messageId, isCached]);

  if (!file) return null;

  // 1. Tải file từ Telegram vào bộ nhớ đệm ứng dụng Cloud (LƯU TẠM - Không ghi vào tệp thiết bị)
  const handleDownloadToApp = async () => {
    if (isDownloading) return;

    if (onDownloadToApp) {
      onDownloadToApp(file);
    }

    setIsDownloading(true);
    setDownloadProgress(0);
    setDownloadSpeed("Đang kết nối...");
    showToast(`Đang tải ${file.name} vào Cloud app...`);

    try {
      const res = await downloadTelegramFile(config, file.messageId, (p, speed) => {
        setDownloadProgress(p);
        if (speed) setDownloadSpeed(speed);
      });

      const localUrl = URL.createObjectURL(res.blob);
      setDownloadedUrl(localUrl);
      setIsLocallyCached(true);
      showToast(`Đã lưu tạm "${file.name}" vào Cloud app thành công! ✅`);
    } catch (err: any) {
      console.error("Lỗi tải tệp vào Cloud app:", err);
      showToast("Lỗi khi tải tệp: " + (err.message || "Thử lại sau"));
    } finally {
      setIsDownloading(false);
      setDownloadProgress(null);
      setDownloadSpeed(null);
    }
  };

  // 2. Chia sẻ / Xuất ra Tệp của thiết bị (Chỉ kích hoạt khi người dùng chủ động bấm Chia sẻ)
  const handleExportToDevice = async () => {
    try {
      showToast(`Đang chuẩn bị chia sẻ ${file.name}...`);
      let dataBlob: Blob | null = null;
      if (downloadedUrl) {
        const res = await fetch(downloadedUrl);
        dataBlob = await res.blob();
      } else {
        const res = await downloadTelegramFile(config, file.messageId);
        dataBlob = res.blob;
      }

      if (!dataBlob) return;
      const fileObj = new File([dataBlob], file.name, { type: file.mimeType });

      if (navigator.canShare && navigator.canShare({ files: [fileObj] })) {
        await navigator.share({
          files: [fileObj],
          title: file.name,
        });
        showToast("Đã mở menu chia sẻ!");
        return;
      }

      // Trình duyệt dự phòng
      const a = document.createElement("a");
      a.href = URL.createObjectURL(dataBlob);
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      showToast("Đã lưu tệp ra máy!");
    } catch (err: any) {
      console.error("Lỗi chia sẻ:", err);
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

        {/* Nút Chia sẻ / Xuất tệp ra máy */}
        <button
          onClick={handleExportToDevice}
          className="w-8 h-8 rounded-full bg-neutral-800/80 flex items-center justify-center text-blue-400 active:opacity-60"
          title="Chia sẻ / Xuất ra Tệp thiết bị"
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
                onClick={handleDownloadToApp}
                disabled={isDownloading}
                className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 active:scale-98 transition-all"
              >
                {isDownloading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Đang tải vào Cloud app ({downloadProgress || 0}%)...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-white" />
                    <span>Tải vào Cloud app & Phát âm thanh</span>
                  </>
                )}
              </button>
            )}
          </div>
        ) : (
          /* Trường hợp 4: Tài liệu, File nén, Cài đặt IPA/APK, Code, File khác */
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
                  <span>Trạng thái</span>
                </span>
                <span className={`font-semibold ${isLocallyCached ? "text-emerald-400" : "text-neutral-400"}`}>
                  {isLocallyCached ? "Đã lưu tạm trong Cloud app" : "Lưu trữ trên Telegram"}
                </span>
              </div>
            </div>

            {/* Khối Tiến trình hoặc Nút Tải vào Cloud app */}
            {isLocallyCached ? (
              <div className="space-y-2.5 w-full">
                <div className="p-3 bg-emerald-950/40 border border-emerald-500/30 rounded-2xl flex items-center justify-between text-left">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-emerald-400">Đã lưu trong Cloud app</p>
                      <p className="text-[10px] text-neutral-400">Sẵn sàng mở tức thì không tốn mạng</p>
                    </div>
                  </div>
                  <span className="text-[10px] bg-emerald-500/15 text-emerald-300 font-bold px-2 py-0.5 rounded-full border border-emerald-500/25">
                    Offline
                  </span>
                </div>

                {/* Nút tùy chọn nếu muốn xuất ra Tệp thiết bị */}
                <button
                  onClick={handleExportToDevice}
                  className="w-full py-2.5 px-4 bg-neutral-800/90 hover:bg-neutral-700 active:scale-98 text-neutral-300 font-semibold rounded-xl text-xs flex items-center justify-center gap-2 transition-all cursor-pointer border border-neutral-700/60"
                >
                  <Share2 className="w-3.5 h-3.5 text-blue-400" />
                  <span>Chia sẻ / Lưu vào Tệp thiết bị</span>
                </button>
              </div>
            ) : isDownloading ? (
              /* Tiến trình tải xuống thời gian thực */
              <div className="w-full p-4 bg-neutral-800/80 border border-blue-500/30 rounded-2xl space-y-2 text-left">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="flex items-center gap-1.5 text-blue-400">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Đang tải vào Cloud app...</span>
                  </span>
                  <span className="font-mono text-blue-400 font-bold">{downloadProgress || 0}%</span>
                </div>

                {/* Thanh tiến trình gradient */}
                <div className="w-full bg-neutral-700/60 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 h-2 rounded-full transition-all duration-200"
                    style={{ width: `${downloadProgress || 0}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-[11px] text-neutral-400">
                  <span>Tốc độ: {downloadSpeed || "Đang đo..."}</span>
                  <span className="text-neutral-300 font-medium">{file.sizeFormatted}</span>
                </div>
              </div>
            ) : (
              /* Nút Tải vào Cloud app */
              <button
                onClick={handleDownloadToApp}
                className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 active:scale-98 text-white font-bold rounded-2xl text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25 transition-all cursor-pointer"
              >
                <DownloadCloud className="w-4 h-4" />
                <span>Tải vào Cloud app (Lưu tạm)</span>
              </button>
            )}
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

        {/* Nút Tải vào Cloud app */}
        <button
          onClick={handleDownloadToApp}
          disabled={isDownloading}
          className="p-2 text-neutral-300 active:opacity-60 transition-transform active:scale-110"
          title={isLocallyCached ? "Đã lưu tạm trong Cloud app" : "Tải vào Cloud app"}
        >
          {isDownloading ? (
            <div className="flex items-center gap-1 text-blue-400 text-xs font-bold font-mono">
              <RefreshCw className="w-5 h-5 animate-spin" />
              <span>{downloadProgress || 0}%</span>
            </div>
          ) : isLocallyCached ? (
            <CheckCircle2 className="w-6 h-6 text-emerald-400" />
          ) : (
            <DownloadCloud className="w-6 h-6" />
          )}
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
