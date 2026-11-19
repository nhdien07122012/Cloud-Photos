/**
 * DriveTabBar.tsx - Thanh điều hướng đáy chuẩn iOS cho Cloud Drive
 */

import React, { useRef } from "react";
import {
  HardDrive,
  Clock,
  ArrowUpDown,
  Settings,
  Plus,
} from "lucide-react";

export type DriveTab = "drive" | "recent" | "transfers" | "settings";

interface DriveTabBarProps {
  currentTab: DriveTab;
  onSelectTab: (tab: DriveTab) => void;
  activeTransfersCount: number;
  onFilesSelected: (files: File[]) => void;
  onOpenSettings: () => void;
}

export const DriveTabBar: React.FC<DriveTabBarProps> = ({
  currentTab,
  onSelectTab,
  activeTransfersCount,
  onFilesSelected,
  onOpenSettings,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFabClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const fileList = Array.from(e.target.files);
      onFilesSelected(fileList);
      // Reset input để có thể chọn lại cùng file nếu muốn
      e.target.value = "";
    }
  };

  return (
    <>
      {/* Hidden Native File Input (cho phép chọn bất kỳ file nào từ iPhone Files) */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        onChange={handleFileChange}
        className="hidden"
      />

      <div className="fixed bottom-0 inset-x-0 z-40 bg-neutral-950/85 backdrop-blur-2xl border-t border-neutral-800/80 pb-[var(--sab)] select-none">
        <div className="h-16 px-4 flex items-center justify-between max-w-lg mx-auto relative">
          {/* Tab 1: Drive (Tệp của tôi) */}
          <button
            onClick={() => onSelectTab("drive")}
            className={`flex-1 flex flex-col items-center justify-center py-1 transition-colors active:scale-95 ${
              currentTab === "drive" ? "text-blue-400" : "text-neutral-400 hover:text-neutral-200"
            }`}
          >
            <HardDrive className="w-5 h-5 mb-1" />
            <span className="text-[10px] font-semibold">Tệp Drive</span>
          </button>

          {/* Tab 2: Gần đây */}
          <button
            onClick={() => onSelectTab("recent")}
            className={`flex-1 flex flex-col items-center justify-center py-1 transition-colors active:scale-95 ${
              currentTab === "recent" ? "text-blue-400" : "text-neutral-400 hover:text-neutral-200"
            }`}
          >
            <Clock className="w-5 h-5 mb-1" />
            <span className="text-[10px] font-semibold">Gần đây</span>
          </button>

          {/* Nút FAB chính giữa (Tải tệp lên) */}
          <div className="flex-1 flex justify-center -mt-6">
            <button
              onClick={handleFabClick}
              className="w-13 h-13 rounded-full bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 text-white flex items-center justify-center shadow-xl shadow-blue-500/35 border-2 border-neutral-900 active:scale-90 transition-transform"
              title="Tải tệp lên Kênh"
            >
              <Plus className="w-7 h-7 stroke-[2.5]" />
            </button>
          </div>

          {/* Tab 3: Tiến trình truyền tệp */}
          <button
            onClick={() => onSelectTab("transfers")}
            className={`flex-1 flex flex-col items-center justify-center py-1 transition-colors relative active:scale-95 ${
              currentTab === "transfers" ? "text-blue-400" : "text-neutral-400 hover:text-neutral-200"
            }`}
          >
            <div className="relative">
              <ArrowUpDown className="w-5 h-5 mb-1" />
              {activeTransfersCount > 0 && (
                <span className="absolute -top-1 -right-2.5 w-4 h-4 rounded-full bg-blue-500 text-white text-[9px] font-extrabold flex items-center justify-center animate-pulse">
                  {activeTransfersCount}
                </span>
              )}
            </div>
            <span className="text-[10px] font-semibold">Tiến trình</span>
          </button>

          {/* Tab 4: Cài đặt */}
          <button
            onClick={onOpenSettings}
            className={`flex-1 flex flex-col items-center justify-center py-1 transition-colors active:scale-95 ${
              currentTab === "settings" ? "text-blue-400" : "text-neutral-400 hover:text-neutral-200"
            }`}
          >
            <Settings className="w-5 h-5 mb-1" />
            <span className="text-[10px] font-semibold">Cài đặt</span>
          </button>
        </div>
      </div>
    </>
  );
};
