import React from "react";
import { LayoutGrid, Sparkles, Folder, Settings, Search, Plus } from "lucide-react";

interface TabBarProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
  onOpenSettings: () => void;
  onOpenAddPhoto: () => void;
  isDarkMode?: boolean;
}

export const TabBar: React.FC<TabBarProps> = ({
  currentTab,
  onTabChange,
  onOpenSettings,
  onOpenAddPhoto,
  isDarkMode = true,
}) => {
  const tabs = [
    { id: "library", label: "Thư viện", icon: LayoutGrid },
    { id: "memories", label: "Kỷ niệm", icon: Sparkles },
    { id: "albums", label: "Album", icon: Folder },
    { id: "settings", label: "Cài đặt", icon: Settings },
  ];

  const isSearchActive = currentTab === "search";

  return (
    <div
      style={{
        paddingBottom: "max(calc(var(--sab) - 10px), 12px)",
      }}
      className="fixed inset-x-0 bottom-0 z-30 pointer-events-none px-4 flex items-end justify-center gap-3"
    >
      {/* Viên nang lớn chứa các Tab chính với hiệu ứng mờ kính (Kích thước phóng to chuẩn Apple) */}
      <nav
        style={{
          backdropFilter: "blur(28px)",
          WebkitBackdropFilter: "blur(28px)",
        }}
        className={`pointer-events-auto flex items-center rounded-full p-1.5 min-h-[64px] transition-all duration-200 ${
          isDarkMode
            ? "bg-[#18181c]/85 border border-white/15 shadow-2xl shadow-black/90"
            : "bg-white/90 border border-black/10 shadow-2xl shadow-black/15"
        }`}
      >
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id;

          const handleClick = () => {
            if (tab.id === "settings") {
              onOpenSettings();
            } else {
              onTabChange(tab.id);
            }
          };

          return (
            <button
              key={tab.id}
              onClick={handleClick}
              className={`flex flex-col items-center justify-center px-4 py-2 min-w-[70px] rounded-full transition-all duration-200 active:scale-95 ${
                isActive
                  ? isDarkMode
                    ? "bg-[#2c2c2e]/95 border border-white/20 text-[#ff375f] shadow-md"
                    : "bg-neutral-200/90 border border-black/10 text-[#ff375f] shadow-md"
                  : isDarkMode
                  ? "text-neutral-300 hover:text-white active:opacity-70"
                  : "text-neutral-700 hover:text-black active:opacity-70"
              }`}
            >
              <Icon
                className={`w-6 h-6 mb-1 transition-transform duration-200 ${
                  isActive
                    ? "text-[#ff375f] stroke-[2.6]"
                    : isDarkMode
                    ? "text-white stroke-[2.2]"
                    : "text-neutral-800 stroke-[2.2]"
                }`}
              />
              <span
                className={`text-xs tracking-tight leading-tight ${
                  isActive
                    ? "font-extrabold text-[#ff375f]"
                    : isDarkMode
                    ? "font-bold text-white"
                    : "font-bold text-neutral-800"
                }`}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </nav>

      {/* Cột dọc chứa nút Thêm (+) và nút Tìm kiếm (Search) phóng to dễ chạm */}
      <div className="flex flex-col items-center gap-2.5 pointer-events-none">
        {/* Nút Thêm ảnh (+) to đẹp dễ bấm */}
        <button
          onClick={onOpenAddPhoto}
          style={{
            backdropFilter: "blur(28px)",
            WebkitBackdropFilter: "blur(28px)",
          }}
          className={`pointer-events-auto w-[62px] h-[62px] rounded-full flex items-center justify-center transition-all duration-200 active:scale-95 shrink-0 border ${
            isDarkMode
              ? "bg-[#18181c]/85 border-white/15 shadow-2xl shadow-black/90 text-white hover:text-neutral-200"
              : "bg-white/90 border-black/10 shadow-2xl shadow-black/15 text-neutral-900 hover:text-black"
          }`}
          title="Tải ảnh mới lên Telegram"
        >
          <Plus className="w-7 h-7 stroke-[2.6]" />
        </button>

        {/* Nút Tìm kiếm hình tròn to */}
        <button
          onClick={() => onTabChange("search")}
          style={{
            backdropFilter: "blur(28px)",
            WebkitBackdropFilter: "blur(28px)",
          }}
          className={`pointer-events-auto w-[62px] h-[62px] rounded-full flex items-center justify-center transition-all duration-200 active:scale-95 shrink-0 border ${
            isDarkMode
              ? isSearchActive
                ? "bg-[#2c2c2e]/95 border-[#ff375f]/60 text-[#ff375f] shadow-2xl shadow-black/90"
                : "bg-[#18181c]/85 border-white/15 shadow-2xl shadow-black/90 text-white hover:text-neutral-200"
              : isSearchActive
              ? "bg-neutral-200/95 border-[#ff375f]/60 text-[#ff375f] shadow-2xl shadow-black/15"
              : "bg-white/90 border-black/10 shadow-2xl shadow-black/15 text-neutral-900 hover:text-black"
          }`}
          title="Tìm kiếm"
        >
          <Search
            className={`w-7 h-7 transition-transform duration-200 ${
              isSearchActive
                ? "text-[#ff375f] stroke-[2.8]"
                : isDarkMode
                ? "text-white stroke-[2.4]"
                : "text-neutral-800 stroke-[2.4]"
            }`}
          />
        </button>
      </div>
    </div>
  );
};
