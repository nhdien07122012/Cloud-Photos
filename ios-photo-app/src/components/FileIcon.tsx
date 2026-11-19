/**
 * FileIcon.tsx - Biểu tượng tệp tin trực quan theo chuẩn Apple Files / macOS
 */

import React from "react";
import type { CloudFile } from "../types";
import {
  FileText,
  FileSpreadsheet,
  FileCode,
  FileArchive,
  Film,
  Music,
  Image as ImageIcon,
  Package,
  File,
  FileQuestion,
} from "lucide-react";

interface FileIconProps {
  file: CloudFile;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  showThumbnail?: boolean;
}

export const FileIcon: React.FC<FileIconProps> = ({
  file,
  size = "md",
  className = "",
  showThumbnail = true,
}) => {
  const ext = (file.extension || "").toLowerCase();
  const category = file.category;

  // Nếu có thumbnail hiển thị và bật thumbnail
  if (showThumbnail && file.thumbnailUrl && (category === "image" || category === "video")) {
    const sizeClasses = {
      sm: "w-9 h-9 rounded-lg",
      md: "w-12 h-12 rounded-xl",
      lg: "w-16 h-16 rounded-2xl",
      xl: "w-24 h-24 rounded-3xl",
    }[size];

    return (
      <div className={`relative overflow-hidden shrink-0 bg-neutral-800 ${sizeClasses} ${className}`}>
        <img
          src={file.thumbnailUrl}
          alt={file.name}
          className="w-full h-full object-cover"
          loading="lazy"
        />
        {category === "video" && (
          <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
            <Film className="w-4 h-4 text-white drop-shadow" />
          </div>
        )}
      </div>
    );
  }

  // Cấu hình kích thước hộp icon
  const boxSizes = {
    sm: "w-9 h-9 rounded-lg text-xs",
    md: "w-12 h-12 rounded-xl text-sm",
    lg: "w-16 h-16 rounded-2xl text-base",
    xl: "w-20 h-20 rounded-2xl text-lg",
  }[size];

  const iconSizes = {
    sm: "w-4 h-4",
    md: "w-6 h-6",
    lg: "w-8 h-8",
    xl: "w-10 h-10",
  }[size];

  // Màu sắc và icon theo từng loại tệp
  // 1. PDF
  if (ext === "pdf") {
    return (
      <div className={`shrink-0 flex flex-col items-center justify-center bg-gradient-to-br from-red-500 to-rose-700 text-white shadow-sm ${boxSizes} ${className}`}>
        <FileText className={iconSizes} />
        {size !== "sm" && <span className="text-[9px] font-bold tracking-wider uppercase mt-0.5">PDF</span>}
      </div>
    );
  }

  // 2. Excel / Bảng tính
  if (["xlsx", "xls", "csv", "numbers"].includes(ext)) {
    return (
      <div className={`shrink-0 flex flex-col items-center justify-center bg-gradient-to-br from-emerald-500 to-green-700 text-white shadow-sm ${boxSizes} ${className}`}>
        <FileSpreadsheet className={iconSizes} />
        {size !== "sm" && <span className="text-[9px] font-bold tracking-wider uppercase mt-0.5">XLS</span>}
      </div>
    );
  }

  // 3. Word / Văn bản
  if (["docx", "doc", "pages", "rtf"].includes(ext)) {
    return (
      <div className={`shrink-0 flex flex-col items-center justify-center bg-gradient-to-br from-blue-500 to-sky-700 text-white shadow-sm ${boxSizes} ${className}`}>
        <FileText className={iconSizes} />
        {size !== "sm" && <span className="text-[9px] font-bold tracking-wider uppercase mt-0.5">DOC</span>}
      </div>
    );
  }

  // 4. Code / Lập trình
  if (category === "code") {
    return (
      <div className={`shrink-0 flex flex-col items-center justify-center bg-gradient-to-br from-violet-500 to-purple-700 text-white shadow-sm ${boxSizes} ${className}`}>
        <FileCode className={iconSizes} />
        {size !== "sm" && <span className="text-[9px] font-bold tracking-wider uppercase mt-0.5">{ext.slice(0, 4)}</span>}
      </div>
    );
  }

  // 5. File nén (ZIP, RAR, 7Z)
  if (category === "archive") {
    return (
      <div className={`shrink-0 flex flex-col items-center justify-center bg-gradient-to-br from-amber-500 to-orange-700 text-white shadow-sm ${boxSizes} ${className}`}>
        <FileArchive className={iconSizes} />
        {size !== "sm" && <span className="text-[9px] font-bold tracking-wider uppercase mt-0.5">{ext.slice(0, 3)}</span>}
      </div>
    );
  }

  // 6. Ứng dụng / Cài đặt (IPA, APK, EXE)
  if (category === "app") {
    return (
      <div className={`shrink-0 flex flex-col items-center justify-center bg-gradient-to-br from-cyan-500 to-teal-700 text-white shadow-sm ${boxSizes} ${className}`}>
        <Package className={iconSizes} />
        {size !== "sm" && <span className="text-[9px] font-bold tracking-wider uppercase mt-0.5">{ext.slice(0, 3)}</span>}
      </div>
    );
  }

  // 7. Nhạc / Audio
  if (category === "audio") {
    return (
      <div className={`shrink-0 flex flex-col items-center justify-center bg-gradient-to-br from-pink-500 to-rose-600 text-white shadow-sm ${boxSizes} ${className}`}>
        <Music className={iconSizes} />
        {size !== "sm" && <span className="text-[9px] font-bold tracking-wider uppercase mt-0.5">AUDIO</span>}
      </div>
    );
  }

  // 8. Video
  if (category === "video") {
    return (
      <div className={`shrink-0 flex flex-col items-center justify-center bg-gradient-to-br from-indigo-500 to-blue-700 text-white shadow-sm ${boxSizes} ${className}`}>
        <Film className={iconSizes} />
        {size !== "sm" && <span className="text-[9px] font-bold tracking-wider uppercase mt-0.5">VIDEO</span>}
      </div>
    );
  }

  // 9. Hình ảnh không có thumbnail
  if (category === "image") {
    return (
      <div className={`shrink-0 flex flex-col items-center justify-center bg-gradient-to-br from-teal-500 to-emerald-700 text-white shadow-sm ${boxSizes} ${className}`}>
        <ImageIcon className={iconSizes} />
        {size !== "sm" && <span className="text-[9px] font-bold tracking-wider uppercase mt-0.5">IMG</span>}
      </div>
    );
  }

  // 10. Mặc định / File khác
  return (
    <div className={`shrink-0 flex flex-col items-center justify-center bg-gradient-to-br from-neutral-600 to-neutral-800 text-neutral-200 shadow-sm ${boxSizes} ${className}`}>
      {ext ? <File className={iconSizes} /> : <FileQuestion className={iconSizes} />}
      {size !== "sm" && ext && <span className="text-[9px] font-bold tracking-wider uppercase mt-0.5">{ext.slice(0, 4)}</span>}
    </div>
  );
};
