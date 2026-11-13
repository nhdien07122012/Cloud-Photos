import React, { useState, useRef, useEffect } from "react";
import {
  Menu,
  Check,
  Heart,
  Settings,
  ChevronRight,
  ChevronDown,
  Eye,
} from "lucide-react";

interface HeaderProps {
  dateRangeText?: string;
  isSelectMode: boolean;
  onToggleSelectMode: () => void;
  sortBy: "added" | "date";
  onSortChange: (sort: "added" | "date") => void;
  activeFilter: string;
  onFilterChange: (filter: string) => void;
  onOpenSettings: () => void;
  isDarkMode?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  dateRangeText = "Tháng 11, 2026",
  isSelectMode,
  onToggleSelectMode,
  sortBy,
  onSortChange,
  activeFilter,
  onFilterChange,
  onOpenSettings,
  isDarkMode = true,
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showFilterSubmenu, setShowFilterSubmenu] = useState(false);
  const [showViewSubmenu, setShowViewSubmenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Đóng menu khi click ra ngoài
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false);
        setShowFilterSubmenu(false);
        setShowViewSubmenu(false);
      }
    };
    if (isMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isMenuOpen]);

  return (
    <header
      className={`sticky top-0 z-30 pt-[var(--sat)] backdrop-blur-2xl transition-colors duration-200 border-b ${
        isDarkMode
          ? "bg-black/80 border-neutral-800/80 text-white"
          : "bg-[#f2f2f7]/85 border-neutral-200 text-neutral-900"
      }`}
    >
      <div className="px-5 pt-3 pb-3 flex items-end justify-between">
        {/* Tiêu đề lớn "Thư viện" và ngày tháng bên dưới chuẩn Apple Photos iOS 18 */}
        <div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight leading-none">
            Thư viện
          </h1>
          <p
            className={`text-sm sm:text-base font-semibold mt-1 tracking-tight ${
              isDarkMode ? "text-neutral-300" : "text-neutral-600"
            }`}
          >
            {dateRangeText}
          </p>
        </div>

        {/* Cụm nút điều khiển bên phải: Nút Lọc (3 gạch) & Nút Chọn/Xong */}
        <div className="flex items-center gap-2.5 relative" ref={menuRef}>
          {/* Nút 3 gạch ngang mở Menu Lọc & Sắp xếp (Kính mờ lớn) */}
          <button
            type="button"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            style={{
              backdropFilter: "blur(24px)",
              WebkitBackdropFilter: "blur(24px)",
            }}
            className={`w-11 h-11 rounded-full flex items-center justify-center transition-all active:scale-95 border ${
              isDarkMode
                ? "bg-neutral-800/80 border-white/15 text-white active:bg-neutral-700 shadow-md"
                : "bg-white/85 border-black/10 text-neutral-800 active:bg-neutral-100 shadow-md"
            }`}
            title="Tùy chọn sắp xếp & Lọc"
          >
            <Menu className="w-5 h-5 stroke-[2.4]" />
          </button>

          {/* Nút Chọn / Xong dạng viên nang kính mờ to */}
          <button
            type="button"
            onClick={onToggleSelectMode}
            style={{
              backdropFilter: "blur(24px)",
              WebkitBackdropFilter: "blur(24px)",
            }}
            className={`px-5 py-2.5 rounded-full text-base font-bold transition-all active:scale-95 border ${
              isSelectMode
                ? "bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-600/30"
                : isDarkMode
                ? "bg-neutral-800/80 border-white/15 text-white active:bg-neutral-700 shadow-md"
                : "bg-white/85 border-black/10 text-neutral-900 active:bg-neutral-100 shadow-md"
            }`}
          >
            {isSelectMode ? "Xong" : "Chọn"}
          </button>

          {/* Menu Popover Sắp xếp & Lọc chuẩn iOS (Ảnh 3) */}
          {isMenuOpen && (
            <div
              style={{
                backdropFilter: "blur(32px)",
                WebkitBackdropFilter: "blur(32px)",
              }}
              className={`absolute top-14 right-0 w-80 rounded-3xl p-3 shadow-2xl border z-50 animate-in fade-in zoom-in-95 duration-150 ${
                isDarkMode
                  ? "bg-[#1c1c1e]/95 border-white/15 text-white shadow-black/90"
                  : "bg-white/95 border-neutral-200 text-neutral-900 shadow-black/20"
              }`}
            >
              <div className="space-y-1">
                {/* 1. Sắp xếp theo Đã thêm gần đây (dấu ✓ bên trái chuẩn iOS Ảnh 3) */}
                <button
                  type="button"
                  onClick={() => {
                    onSortChange("added");
                    setIsMenuOpen(false);
                  }}
                  className={`w-full px-3 py-3 rounded-2xl text-left text-[15px] font-semibold flex items-center gap-3 transition-colors ${
                    sortBy === "added"
                      ? isDarkMode
                        ? "bg-white/10 text-white"
                        : "bg-black/5 text-black"
                      : "hover:bg-white/5 opacity-90"
                  }`}
                >
                  <div className="w-5 flex items-center justify-center shrink-0">
                    {sortBy === "added" ? (
                      <Check className="w-5 h-5 text-blue-400 stroke-[3]" />
                    ) : (
                      <span className="w-5" />
                    )}
                  </div>
                  <span className="leading-snug">Sắp xếp theo Đã thêm gần đây</span>
                </button>

                {/* 2. Sắp xếp theo Ngày chụp (dấu ✓ bên trái chuẩn iOS Ảnh 3) */}
                <button
                  type="button"
                  onClick={() => {
                    onSortChange("date");
                    setIsMenuOpen(false);
                  }}
                  className={`w-full px-3 py-3 rounded-2xl text-left text-[15px] font-semibold flex items-center gap-3 transition-colors ${
                    sortBy === "date"
                      ? isDarkMode
                        ? "bg-white/10 text-white"
                        : "bg-black/5 text-black"
                      : "hover:bg-white/5 opacity-90"
                  }`}
                >
                  <div className="w-5 flex items-center justify-center shrink-0">
                    {sortBy === "date" ? (
                      <Check className="w-5 h-5 text-blue-400 stroke-[3]" />
                    ) : (
                      <span className="w-5" />
                    )}
                  </div>
                  <span className="leading-snug">Sắp xếp theo Ngày chụp</span>
                </button>
              </div>

              {/* Vạch ngăn chuẩn iOS */}
              <div className={`my-2 border-t ${isDarkMode ? "border-neutral-700/60" : "border-neutral-200"}`} />

              {/* Mục Lọc > (Ảnh 3) */}
              <div>
                <button
                  type="button"
                  onClick={() => setShowFilterSubmenu(!showFilterSubmenu)}
                  className={`w-full px-3 py-2.5 rounded-2xl text-left text-[15px] font-semibold flex items-center justify-between transition-colors ${
                    showFilterSubmenu
                      ? isDarkMode
                        ? "bg-white/10"
                        : "bg-black/5"
                      : "hover:bg-white/5 opacity-90"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-5 flex items-center justify-center">
                      <Heart className="w-4 h-4 text-red-400 fill-red-400/20" />
                    </div>
                    <span>Lọc</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-neutral-400">
                    <span className="text-xs font-normal">
                      {activeFilter === "Tất cả" ? "" : activeFilter}
                    </span>
                    {showFilterSubmenu ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                  </div>
                </button>

                {/* Submenu Lọc */}
                {showFilterSubmenu && (
                  <div className="mt-1 ml-6 pl-2 border-l border-neutral-700/60 space-y-1 py-1">
                    <button
                      type="button"
                      onClick={() => {
                        onFilterChange("Tất cả");
                        setIsMenuOpen(false);
                      }}
                      className={`w-full px-3 py-2 rounded-xl text-left text-sm font-semibold flex items-center justify-between ${
                        activeFilter === "Tất cả"
                          ? "text-blue-400"
                          : "text-neutral-300 hover:text-white"
                      }`}
                    >
                      <span>Tất cả</span>
                      {activeFilter === "Tất cả" && <Check className="w-4 h-4 text-blue-400" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onFilterChange("Yêu thích");
                        setIsMenuOpen(false);
                      }}
                      className={`w-full px-3 py-2 rounded-xl text-left text-sm font-semibold flex items-center justify-between ${
                        activeFilter === "Yêu thích"
                          ? "text-blue-400"
                          : "text-neutral-300 hover:text-white"
                      }`}
                    >
                      <span>Mục yêu thích</span>
                      {activeFilter === "Yêu thích" && <Check className="w-4 h-4 text-blue-400" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onFilterChange("Album");
                        setIsMenuOpen(false);
                      }}
                      className={`w-full px-3 py-2 rounded-xl text-left text-sm font-semibold flex items-center justify-between ${
                        activeFilter === "Album"
                          ? "text-blue-400"
                          : "text-neutral-300 hover:text-white"
                      }`}
                    >
                      <span>Bài viết nhiều ảnh</span>
                      {activeFilter === "Album" && <Check className="w-4 h-4 text-blue-400" />}
                    </button>
                  </div>
                )}
              </div>

              {/* Mục Tùy chọn xem > (Ảnh 3) */}
              <div>
                <button
                  type="button"
                  onClick={() => setShowViewSubmenu(!showViewSubmenu)}
                  className={`w-full px-3 py-2.5 rounded-2xl text-left text-[15px] font-semibold flex items-center justify-between transition-colors ${
                    showViewSubmenu
                      ? isDarkMode
                        ? "bg-white/10"
                        : "bg-black/5"
                      : "hover:bg-white/5 opacity-90"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-5 flex items-center justify-center">
                      <Eye className="w-4 h-4 text-neutral-400" />
                    </div>
                    <span>Tùy chọn xem</span>
                  </div>
                  {showViewSubmenu ? (
                    <ChevronDown className="w-4 h-4 text-neutral-400" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-neutral-400" />
                  )}
                </button>

                {/* Submenu Tùy chọn xem */}
                {showViewSubmenu && (
                  <div className="mt-1 ml-6 pl-2 border-l border-neutral-700/60 space-y-1 py-1 text-xs text-neutral-400">
                    <p className="px-3 py-1">
                      Vuốt 2 ngón tay trên màn hình hoặc chụm mở để phóng to / thu nhỏ lưới ảnh lên tới 4.5x.
                    </p>
                  </div>
                )}
              </div>

              {/* Vạch ngăn */}
              <div className={`my-2 border-t ${isDarkMode ? "border-neutral-700/60" : "border-neutral-200"}`} />

              {/* Nút Cài đặt */}
              <button
                type="button"
                onClick={() => {
                  setIsMenuOpen(false);
                  onOpenSettings();
                }}
                className="w-full px-3 py-2.5 rounded-2xl text-left text-sm font-semibold flex items-center gap-3 text-neutral-400 hover:text-white transition-colors"
              >
                <div className="w-5 flex items-center justify-center">
                  <Settings className="w-4 h-4" />
                </div>
                <span>Cài đặt ứng dụng...</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
