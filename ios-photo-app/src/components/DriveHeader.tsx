/**
 * DriveHeader.tsx - Thanh tiêu đề, tìm kiếm, lọc và sắp xếp chuẩn Apple Files
 */

import React from "react";
import type { FileCategory } from "../types";
import {
  Search,
  X,
  LayoutGrid,
  List,
  ArrowUpDown,
  FolderOpen,
} from "lucide-react";

export type SortOption = "date_desc" | "date_asc" | "name_asc" | "size_desc";

interface DriveHeaderProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedCategory: FileCategory | "all" | "starred";
  onSelectCategory: (cat: FileCategory | "all" | "starred") => void;
  viewMode: "list" | "grid";
  onToggleViewMode: () => void;
  sortOption: SortOption;
  onSortChange: (sort: SortOption) => void;
  isSelectionMode: boolean;
  onToggleSelectionMode: () => void;
  selectedCount: number;
  totalFilesCount: number;
  totalStorageFormatted: string;
  currentFolder: string;
  onNavigateHome: () => void;
  isLoggedIn: boolean;
  onOpenSettings: () => void;
  channelTitle?: string;
}

export const DriveHeader: React.FC<DriveHeaderProps> = ({
  searchQuery,
  onSearchChange,
  selectedCategory,
  onSelectCategory,
  viewMode,
  onToggleViewMode,
  sortOption,
  onSortChange,
  isSelectionMode,
  onToggleSelectionMode,
  selectedCount,
  totalFilesCount,
  totalStorageFormatted,
  currentFolder,
  onNavigateHome,
  isLoggedIn,
  onOpenSettings,
  channelTitle,
}) => {
  const categories: { key: FileCategory | "all" | "starred"; label: string; icon?: string }[] = [
    { key: "all", label: "Tất cả" },
    { key: "document", label: "📄 Tài liệu" },
    { key: "image", label: "🖼️ Hình ảnh" },
    { key: "video", label: "🎬 Video" },
    { key: "archive", label: "📦 File nén" },
    { key: "app", label: "📱 Cài đặt (IPA/APK)" },
    { key: "audio", label: "🎵 Âm thanh" },
    { key: "starred", label: "⭐ Đã gắn sao" },
  ];

  // Lọc bỏ ID số, chỉ hiển thị tên kênh thân thiện, gọn gàng (không bao giờ hiện ID -100...)
  const cleanChannelDisplay = React.useMemo(() => {
    const raw = (channelTitle || "").trim();
    // Nếu rỗng hoặc chỉ là số/ID âm (-100..., 1234...)
    if (!raw || /^-?\d+$/.test(raw)) {
      return "Đổi kênh";
    }
    // Rút gọn nếu tên có phần đuôi trong ngoặc vuông [DienNguyen] để hiển thị gọn gàng
    const simplified = raw.replace(/\[.*?\]/g, "").trim();
    return simplified || raw;
  }, [channelTitle]);

  return (
    <header className="sticky top-0 z-30 bg-neutral-950/85 backdrop-blur-xl border-b border-neutral-800/80 pt-[var(--sat)] select-none">
      {/* Top Bar: Title & Stats & Status */}
      <div className="px-4 pt-3 pb-2 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-white flex items-center gap-2">
              <span className="bg-gradient-to-r from-blue-400 via-indigo-300 to-purple-400 bg-clip-text text-transparent">
                Cloud Drive
              </span>
            </h1>
            <button
              onClick={onOpenSettings}
              className="h-6 px-2.5 rounded-full text-[11px] font-semibold bg-blue-500/15 text-blue-400 border border-blue-500/30 max-w-[110px] sm:max-w-[140px] flex items-center gap-1 active:scale-95 transition-transform hover:bg-blue-500/25 cursor-pointer shrink-0"
              title={`Kênh lưu trữ: ${channelTitle || "IPA-MOD [DienNguyen]"}. Chạm để đổi kênh.`}
            >
              <span className="text-[10px]">📢</span>
              <span className="truncate">{cleanChannelDisplay}</span>
              <span className="text-[8px] opacity-70">▼</span>
            </button>
          </div>

          <div className="flex items-center gap-2 text-xs text-neutral-400 mt-0.5 font-medium">
            <span>{totalFilesCount} tệp</span>
            <span>•</span>
            <span>{totalStorageFormatted} đám mây</span>
          </div>
        </div>

        {/* Trạng thái kết nối / Nút Cài đặt nhanh */}
        <button
          onClick={onOpenSettings}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all active:scale-95 ${
            isLoggedIn
              ? "bg-emerald-950/40 border-emerald-500/30 text-emerald-400"
              : "bg-amber-950/40 border-amber-500/30 text-amber-400 animate-pulse"
          }`}
        >
          <span className={`w-2 h-2 rounded-full ${isLoggedIn ? "bg-emerald-400" : "bg-amber-400"}`} />
          <span>{isLoggedIn ? "Đã kết nối" : "Chưa đăng nhập"}</span>
        </button>
      </div>

      {/* Breadcrumb nếu đang trong thư mục */}
      {currentFolder && currentFolder !== "/" && (
        <div className="px-4 py-1.5 bg-neutral-900/60 border-t border-neutral-800/60 flex items-center gap-2 text-xs font-medium">
          <button
            onClick={onNavigateHome}
            className="text-blue-400 hover:underline flex items-center gap-1"
          >
            <FolderOpen className="w-3.5 h-3.5" />
            <span>Drive</span>
          </button>
          <span className="text-neutral-500">/</span>
          <span className="text-white truncate max-w-[200px]">{currentFolder}</span>
        </div>
      )}

      {/* Search Input Bar */}
      <div className="px-4 py-2">
        <div className="relative flex items-center">
          <Search className="absolute left-3 w-4 h-4 text-neutral-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Tìm tệp theo tên, đuôi mở rộng (.pdf, .zip)..."
            className="w-full h-10 pl-9 pr-8 bg-neutral-900 border border-neutral-800 rounded-xl text-xs sm:text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-blue-500/80 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange("")}
              className="absolute right-2.5 p-1 rounded-full text-neutral-400 active:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Filter Category Scrollable Pills */}
      <div className="px-4 pb-2 flex items-center gap-2 overflow-x-auto no-scrollbar">
        {categories.map((cat) => (
          <button
            key={cat.key}
            onClick={() => onSelectCategory(cat.key)}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium shrink-0 transition-all active:scale-95 border ${
              selectedCategory === cat.key
                ? "bg-blue-600 border-blue-500 text-white shadow-sm shadow-blue-500/20"
                : "bg-neutral-900/90 border-neutral-800 text-neutral-300 hover:border-neutral-700"
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Sub-bar: Sắp xếp, Chế độ xem & Nút Chọn */}
      <div className="px-4 py-2 flex items-center justify-between border-t border-neutral-800/60 bg-neutral-900/40 text-xs">
        <div className="flex items-center gap-2">
          {/* Menu Sắp xếp */}
          <div className="relative flex items-center gap-1 text-neutral-400">
            <ArrowUpDown className="w-3.5 h-3.5 text-neutral-400" />
            <select
              value={sortOption}
              onChange={(e) => onSortChange(e.target.value as SortOption)}
              className="bg-transparent text-neutral-300 font-medium focus:outline-none cursor-pointer py-0.5"
            >
              <option value="date_desc" className="bg-neutral-900 text-white">Mới nhất trước</option>
              <option value="date_asc" className="bg-neutral-900 text-white">Cũ nhất trước</option>
              <option value="name_asc" className="bg-neutral-900 text-white">Tên (A-Z)</option>
              <option value="size_desc" className="bg-neutral-900 text-white">Kích thước lớn nhất</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Nút Chuyển Lưới / Danh sách */}
          <button
            onClick={onToggleViewMode}
            className="p-1.5 rounded-lg bg-neutral-800 text-neutral-300 active:text-white"
            title={viewMode === "list" ? "Chuyển sang dạng Lưới" : "Chuyển sang dạng Danh sách"}
          >
            {viewMode === "list" ? <LayoutGrid className="w-4 h-4" /> : <List className="w-4 h-4" />}
          </button>

          {/* Nút Chọn nhiều file */}
          <button
            onClick={onToggleSelectionMode}
            className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
              isSelectionMode
                ? "bg-blue-600 text-white"
                : "bg-neutral-800 text-neutral-300 active:text-white"
            }`}
          >
            {isSelectionMode ? (selectedCount > 0 ? `Đã chọn (${selectedCount})` : "Hủy chọn") : "Chọn"}
          </button>
        </div>
      </div>
    </header>
  );
};
