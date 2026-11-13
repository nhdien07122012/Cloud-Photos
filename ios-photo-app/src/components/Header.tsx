import React from "react";
import { Settings } from "lucide-react";

interface HeaderProps {
  photoCount: number;
  onOpenSettings: () => void;
  activeFilter: string;
  onFilterChange: (filter: string) => void;
  isDarkMode?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  photoCount,
  onOpenSettings,
  activeFilter,
  onFilterChange,
  isDarkMode = true,
}) => {
  return (
    <header
      className={`sticky top-0 z-30 pt-[var(--sat)] backdrop-blur-md border-b transition-colors duration-200 ${
        isDarkMode
          ? "bg-black/90 border-neutral-800 text-white"
          : "bg-[#f2f2f7]/90 border-neutral-200 text-neutral-900"
      }`}
    >
      <div className="flex items-center justify-between px-4 h-12">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            Ảnh
            <span
              className={`text-xs font-normal px-2 py-0.5 rounded-full ${
                isDarkMode
                  ? "text-neutral-400 bg-neutral-800"
                  : "text-neutral-600 bg-neutral-200"
              }`}
            >
              {photoCount}
            </span>
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onOpenSettings}
            className={`w-9 h-9 flex items-center justify-center rounded-full transition-colors active:scale-95 ${
              isDarkMode
                ? "bg-neutral-800/80 active:bg-neutral-700 text-neutral-300"
                : "bg-neutral-200/90 active:bg-neutral-300 text-neutral-700 shadow-sm"
            }`}
            title="Cài đặt ứng dụng"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* iOS Segmented Control */}
      <div className="px-4 pb-2">
        <div
          className={`flex p-1 rounded-xl text-xs font-medium overflow-x-auto scrollbar-none transition-colors ${
            isDarkMode ? "bg-neutral-900/90 text-neutral-400" : "bg-neutral-200/80 text-neutral-600"
          }`}
        >
          {["Tất cả", "Hôm nay", "Tuần này", "Yêu thích", "Album"].map((tab) => (
            <button
              key={tab}
              onClick={() => onFilterChange(tab)}
              className={`flex-1 min-w-[64px] py-1.5 rounded-lg transition-all text-center whitespace-nowrap active:scale-98 ${
                activeFilter === tab
                  ? isDarkMode
                    ? "bg-neutral-700 text-white shadow-sm font-semibold"
                    : "bg-white text-neutral-900 shadow-sm font-semibold"
                  : isDarkMode
                  ? "hover:text-neutral-200"
                  : "hover:text-neutral-900"
              }`}
            >
              {tab === "Yêu thích" ? "❤️ " + tab : tab}
            </button>
          ))}
        </div>
      </div>
    </header>
  );
};