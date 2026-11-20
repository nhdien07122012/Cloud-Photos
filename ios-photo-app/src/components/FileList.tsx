/**
 * FileList.tsx - Trình hiển thị danh sách và lưới tệp tin chuẩn Apple Files
 */

import React from "react";
import type { CloudFile, FolderItem } from "../types";
import { FileIcon } from "./FileIcon";
import {
  Folder,
  Star,
  Trash2,
  Check,
  FolderPlus,
  HardDrive,
  DownloadCloud,
  CheckCircle2,
  RefreshCw,
} from "lucide-react";

interface FileListProps {
  files: CloudFile[];
  folders: FolderItem[];
  currentFolder: string;
  onSelectFolder: (folderName: string) => void;
  onCreateFolder: () => void;
  viewMode: "list" | "grid";
  isSelectionMode: boolean;
  selectedIds: Set<number>;
  onToggleSelectFile: (messageId: number) => void;
  onOpenFile: (file: CloudFile) => void;
  onToggleStar: (messageId: number) => void;
  onDownloadFile: (file: CloudFile) => void;
  onDeleteFile: (file: CloudFile) => void;
  onOpenUpload: () => void;
  downloadedFileIds?: Set<number>;
  activeDownloads?: Map<number, { progress: number; speed?: string }>;
}

export const FileList: React.FC<FileListProps> = ({
  files,
  folders,
  currentFolder,
  onSelectFolder,
  onCreateFolder,
  viewMode,
  isSelectionMode,
  selectedIds,
  onToggleSelectFile,
  onOpenFile,
  onToggleStar,
  onDownloadFile,
  onDeleteFile,
  onOpenUpload,
  downloadedFileIds = new Set(),
  activeDownloads = new Map(),
}) => {
  // Hiển thị thư mục nếu đang ở thư mục gốc "/"
  const showFolders = currentFolder === "/";

  if (files.length === 0 && (!showFolders || folders.length === 0)) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center min-h-[50vh]">
        <div className="w-20 h-20 rounded-3xl bg-neutral-900 border border-neutral-800 flex items-center justify-center text-neutral-500 mb-4 shadow-inner">
          <HardDrive className="w-10 h-10" />
        </div>
        <h3 className="text-base font-bold text-white mb-1">Thư mục trống</h3>
        <p className="text-xs text-neutral-400 max-w-xs leading-relaxed mb-6">
          Chưa có tệp nào trên Kênh lưu trữ. Bạn có thể tải lên mọi định dạng tệp: PDF, DOCX, ZIP, IPA, Video, Audio...
        </p>
        <button
          onClick={onOpenUpload}
          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white text-xs font-bold rounded-xl shadow-lg shadow-blue-500/20 transition-all flex items-center gap-2"
        >
          <span>Tải tệp đầu tiên lên</span>
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-5 pb-32">
      {/* 1. Phần Thư mục (Folders) */}
      {showFolders && folders.length > 0 && (
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
              Thư mục ({folders.length})
            </h2>
            <button
              onClick={onCreateFolder}
              className="text-xs text-blue-400 font-semibold flex items-center gap-1 active:opacity-60"
            >
              <FolderPlus className="w-3.5 h-3.5" />
              <span>Tạo mới</span>
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {folders.map((f) => (
              <div
                key={f.id}
                onClick={() => onSelectFolder(f.name)}
                className="bg-neutral-900/90 border border-neutral-800/80 hover:border-blue-500/50 rounded-2xl p-3.5 flex items-center gap-3 cursor-pointer active:scale-98 transition-all group shadow-sm"
              >
                <div className="w-10 h-10 rounded-xl bg-blue-500/15 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0 group-hover:scale-105 transition-transform">
                  <Folder className="w-5 h-5 fill-blue-500/20" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm font-semibold text-white truncate group-hover:text-blue-300">
                    {f.name}
                  </p>
                  <p className="text-[11px] text-neutral-400 mt-0.5">
                    {f.fileCount} tệp • {f.totalSizeFormatted}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 2. Phần Danh sách / Lưới Tệp (Files) */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
            Tệp tin ({files.length})
          </h2>
        </div>

        {viewMode === "list" ? (
          /* Dạng Danh sách (List View) */
          <div className="bg-neutral-900/60 border border-neutral-800/80 rounded-2xl overflow-hidden divide-y divide-neutral-800/60 shadow-sm">
            {files.map((file) => {
              const isSelected = selectedIds.has(file.messageId);
              return (
                <div
                  key={file.id}
                  onClick={() => {
                    if (isSelectionMode) {
                      onToggleSelectFile(file.messageId);
                    } else {
                      onOpenFile(file);
                    }
                  }}
                  className={`flex items-center gap-3 p-3 transition-colors cursor-pointer select-none ${
                    isSelected ? "bg-blue-600/15" : "hover:bg-neutral-800/40 active:bg-neutral-800/70"
                  }`}
                >
                  {/* Cột chọn checkbox */}
                  {isSelectionMode && (
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleSelectFile(file.messageId);
                      }}
                      className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all shrink-0 ${
                        isSelected
                          ? "bg-blue-600 border-blue-500 text-white"
                          : "border-neutral-600 bg-neutral-800/80"
                      }`}
                    >
                      {isSelected && <Check className="w-3.5 h-3.5" />}
                    </div>
                  )}

                  {/* Icon loại file */}
                  <FileIcon file={file} size="md" />

                  {/* Thông tin tên, dung lượng, ngày */}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm font-semibold text-white truncate">
                      {file.name}
                    </p>
                    <div className="flex items-center gap-2 text-[11px] text-neutral-400 mt-0.5 font-medium">
                      <span className="text-neutral-300 font-semibold">{file.sizeFormatted}</span>
                      <span>•</span>
                      <span>
                        {file.date.toLocaleDateString("vi-VN", {
                          day: "numeric",
                          month: "short",
                        })}
                      </span>
                      {file.folder && file.folder !== "/" && (
                        <>
                          <span>•</span>
                          <span className="truncate max-w-[90px] text-blue-400/90 font-medium">
                            {file.folder}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Nút tác vụ nhanh */}
                  {!isSelectionMode && (
                    <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                      {/* Đánh dấu sao */}
                      <button
                        onClick={() => onToggleStar(file.messageId)}
                        className={`p-2 rounded-full transition-transform active:scale-125 ${
                          file.isStarred ? "text-amber-400" : "text-neutral-500 hover:text-neutral-300"
                        }`}
                        title="Gắn dấu sao"
                      >
                        <Star className={`w-4 h-4 ${file.isStarred ? "fill-amber-400" : ""}`} />
                      </button>

                      {/* Nút Tải vào Cloud app / Tiến trình thời gian thực / Đã lưu tạm */}
                      {activeDownloads?.has(file.messageId) ? (
                        <div
                          className="flex items-center gap-1 px-2 py-1 rounded-full bg-blue-500/15 border border-blue-500/30 text-blue-400 text-[10px] font-bold shrink-0 animate-pulse"
                          title={`Đang tải vào Cloud app: ${activeDownloads.get(file.messageId)?.progress || 0}%`}
                        >
                          <RefreshCw className="w-3 h-3 animate-spin" />
                          <span>{activeDownloads.get(file.messageId)?.progress || 0}%</span>
                        </div>
                      ) : downloadedFileIds?.has(file.messageId) ? (
                        <span
                          className="p-1.5 text-emerald-400 shrink-0"
                          title="Đã lưu tạm trong Cloud app (mở tức thì)"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                        </span>
                      ) : (
                        <button
                          onClick={() => onDownloadFile(file)}
                          className="p-2 text-neutral-400 hover:text-blue-400 active:scale-95 transition-colors shrink-0 cursor-pointer"
                          title="Tải vào Cloud app (Lưu tạm)"
                        >
                          <DownloadCloud className="w-4 h-4" />
                        </button>
                      )}

                      {/* Xóa tệp */}
                      <button
                        onClick={() => onDeleteFile(file)}
                        className="p-2 text-neutral-500 hover:text-red-400 active:scale-95 transition-colors"
                        title="Xóa tệp"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          /* Dạng Lưới (Grid View) */
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {files.map((file) => {
              const isSelected = selectedIds.has(file.messageId);
              return (
                <div
                  key={file.id}
                  onClick={() => {
                    if (isSelectionMode) {
                      onToggleSelectFile(file.messageId);
                    } else {
                      onOpenFile(file);
                    }
                  }}
                  className={`relative bg-neutral-900/80 border rounded-2xl p-3 flex flex-col justify-between cursor-pointer active:scale-98 transition-all shadow-sm ${
                    isSelected
                      ? "border-blue-500 bg-blue-600/10 ring-1 ring-blue-500"
                      : "border-neutral-800/80 hover:border-neutral-700"
                  }`}
                >
                  {/* Checkbox khi chọn nhiều */}
                  {isSelectionMode ? (
                    <div
                      className={`absolute top-2.5 left-2.5 z-10 w-5 h-5 rounded-md border flex items-center justify-center transition-all ${
                        isSelected
                          ? "bg-blue-600 border-blue-500 text-white"
                          : "border-neutral-500 bg-black/60 backdrop-blur-sm"
                      }`}
                    >
                      {isSelected && <Check className="w-3.5 h-3.5" />}
                    </div>
                  ) : downloadedFileIds?.has(file.messageId) ? (
                    <div
                      className="absolute top-2.5 left-2.5 z-10 p-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                      title="Đã lưu tạm trong Cloud app"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    </div>
                  ) : null}

                  {/* Nút Sao */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleStar(file.messageId);
                    }}
                    className={`absolute top-2.5 right-2.5 z-10 p-1 rounded-full ${
                      file.isStarred ? "text-amber-400" : "text-neutral-500 opacity-60 hover:opacity-100"
                    }`}
                  >
                    <Star className={`w-3.5 h-3.5 ${file.isStarred ? "fill-amber-400" : ""}`} />
                  </button>

                  {/* Khung Icon chính */}
                  <div className="w-full flex items-center justify-center py-4 relative">
                    <FileIcon file={file} size="lg" />

                    {/* Tiến trình tải trong Grid View */}
                    {activeDownloads?.has(file.messageId) && (
                      <div className="absolute inset-x-1 bottom-0 bg-neutral-950/90 border border-blue-500/40 rounded-lg p-1 flex items-center justify-between text-[9px] font-bold text-blue-400">
                        <span className="flex items-center gap-1">
                          <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                          <span>{activeDownloads.get(file.messageId)?.progress || 0}%</span>
                        </span>
                        <div className="w-10 bg-neutral-800 rounded-full h-1 overflow-hidden">
                          <div
                            className="bg-blue-500 h-1 rounded-full transition-all duration-200"
                            style={{ width: `${activeDownloads.get(file.messageId)?.progress || 0}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Tên và thông số file */}
                  <div className="pt-2 border-t border-neutral-800/60">
                    <p className="text-xs font-semibold text-white truncate" title={file.name}>
                      {file.name}
                    </p>
                    <div className="flex items-center justify-between text-[10px] text-neutral-400 mt-1">
                      <span className="font-medium text-neutral-300">{file.sizeFormatted}</span>
                      <span>
                        {file.date.toLocaleDateString("vi-VN", {
                          day: "numeric",
                          month: "numeric",
                        })}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
