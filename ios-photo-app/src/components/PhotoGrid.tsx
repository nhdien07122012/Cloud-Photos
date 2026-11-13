import React from "react";
import type { PhotoItem, DateGroup } from "../types";
import { Layers, ImagePlus } from "lucide-react";

interface PhotoGridProps {
  groups: DateGroup[];
  onSelectPhoto: (photo: PhotoItem) => void;
  isDarkMode?: boolean;
}

export const PhotoGrid: React.FC<PhotoGridProps> = ({
  groups,
  onSelectPhoto,
  isDarkMode = true,
}) => {
  if (groups.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
        <div
          className={`w-16 h-16 rounded-full flex items-center justify-center mb-3 ${
            isDarkMode ? "bg-neutral-800 text-neutral-400" : "bg-neutral-200 text-neutral-600"
          }`}
        >
          <ImagePlus className="w-8 h-8" />
        </div>
        <p className={`text-base font-semibold ${isDarkMode ? "text-neutral-300" : "text-neutral-700"}`}>
          Chưa có ảnh nào trong kho
        </p>
        <p className={`text-xs mt-1 max-w-xs ${isDarkMode ? "text-neutral-500" : "text-neutral-500"}`}>
          Chạm vào nút dấu cộng (+) bên dưới để chọn ảnh từ thư viện hoặc chụp ảnh mới tải lên Telegram!
        </p>
      </div>
    );
  }

  return (
    <div className="pb-32">
      {groups.map((group, gIdx) => (
        <section key={gIdx} className="mb-6">
          {/* Section Header (Ngày tháng) */}
          <div
            className={`sticky top-[96px] z-20 px-4 py-2 backdrop-blur-md flex items-center justify-between transition-colors duration-200 ${
              isDarkMode
                ? "bg-black/85 text-white"
                : "bg-[#f2f2f7]/85 text-neutral-900 border-b border-neutral-200/50"
            }`}
          >
            <h2 className="text-base font-bold tracking-tight">
              {group.dateTitle}
            </h2>
            <span
              className={`text-xs font-medium ${
                isDarkMode ? "text-neutral-400" : "text-neutral-500"
              }`}
            >
              {group.photos.length} ảnh
            </span>
          </div>

          {/* 3-Column Grid */}
          <div className="grid grid-cols-3 gap-0.5 px-0.5">
            {group.photos.map((photo) => (
              <div
                key={photo.id}
                onClick={() => onSelectPhoto(photo)}
                className={`relative aspect-square overflow-hidden active:opacity-75 transition-opacity cursor-pointer group ${
                  isDarkMode ? "bg-neutral-900" : "bg-neutral-200"
                }`}
              >
                <img
                  src={photo.thumbnailUrl || photo.url}
                  alt={photo.caption || "Cloud photo"}
                  className="w-full h-full object-cover select-none pointer-events-none transform group-active:scale-98 transition-transform"
                  loading="lazy"
                />

                {/* Badge Carousel (Nhiều ảnh) */}
                {photo.isCarousel && (
                  <div className="absolute top-1.5 right-1.5 p-1 rounded-md bg-black/60 backdrop-blur-sm text-white">
                    <Layers className="w-3.5 h-3.5" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
};