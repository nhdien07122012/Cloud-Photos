import React, { useState } from "react";
import type { PhotoItem, DateGroup } from "../types";
import { Layers, ImagePlus, Check, RefreshCw, Image as ImageIcon } from "lucide-react";

interface PhotoGridProps {
  groups: DateGroup[];
  onSelectPhoto: (photo: PhotoItem) => void;
  isDarkMode?: boolean;
  isSelectMode?: boolean;
  selectedPhotoIds?: Set<string | number>;
  onToggleSelectPhoto?: (photo: PhotoItem) => void;
  activeFilter?: string;
  onResetFilter?: () => void;
  onRetryPhoto?: (photo: PhotoItem) => Promise<string | null>;
}

export const PhotoGrid: React.FC<PhotoGridProps> = ({
  groups,
  onSelectPhoto,
  isDarkMode = true,
  isSelectMode = false,
  selectedPhotoIds = new Set(),
  onToggleSelectPhoto,
  activeFilter = "Tất cả",
  onResetFilter,
  onRetryPhoto,
}) => {
  // Trạng thái theo dõi các ảnh bị lỗi để tự động khôi phục
  const [retryingIds, setRetryingIds] = useState<Set<number>>(new Set());
  const [failedIds, setFailedIds] = useState<Set<number>>(new Set());

  const handleImageError = (photo: PhotoItem) => {
    const msgId = photo.messageId;
    if (retryingIds.has(msgId) || failedIds.has(msgId)) return;

    if (onRetryPhoto) {
      setRetryingIds((prev) => new Set(prev).add(msgId));
      onRetryPhoto(photo)
        .then((newUrl) => {
          if (newUrl) {
            photo.url = newUrl;
            photo.thumbnailUrl = newUrl;
          } else {
            setFailedIds((prev) => new Set(prev).add(msgId));
          }
        })
        .catch(() => {
          setFailedIds((prev) => new Set(prev).add(msgId));
        })
        .finally(() => {
          setRetryingIds((prev) => {
            const next = new Set(prev);
            next.delete(msgId);
            return next;
          });
        });
    } else {
      setFailedIds((prev) => new Set(prev).add(msgId));
    }
  };

  if (groups.length === 0) {
    const isFiltered = activeFilter && activeFilter !== "Tất cả";

    return (
      <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
        <div
          className={`w-20 h-20 rounded-3xl flex items-center justify-center mb-4 ${
            isDarkMode ? "bg-neutral-800 text-neutral-400" : "bg-neutral-200 text-neutral-600 shadow-sm"
          }`}
        >
          <ImagePlus className="w-10 h-10" />
        </div>
        <p className={`text-xl font-bold ${isDarkMode ? "text-neutral-200" : "text-neutral-800"}`}>
          {isFiltered ? `Không có ảnh trong mục "${activeFilter}"` : "Chưa có ảnh nào trong kho"}
        </p>
        <p className={`text-sm mt-1.5 max-w-xs ${isDarkMode ? "text-neutral-400" : "text-neutral-500"}`}>
          {isFiltered
            ? "Mục này hiện chưa có bức ảnh nào. Hãy chạm vào nút bên dưới để quay lại xem toàn bộ Thư viện ảnh."
            : "Chạm vào nút dấu cộng (+) bên dưới để chọn ảnh từ máy tải lên Telegram!"}
        </p>
        {isFiltered && onResetFilter && (
          <button
            type="button"
            onClick={onResetFilter}
            className="mt-5 px-5 py-2.5 rounded-full text-sm font-bold bg-blue-600 text-white shadow-lg shadow-blue-600/30 active:scale-95 transition-transform"
          >
            Xem tất cả ảnh Thư viện
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="pb-36">
      {groups.map((group, gIdx) => (
        <section key={gIdx} className="mb-7">
          {/* Section Header (Ngày tháng to rõ ràng) */}
          <div
            className={`sticky top-[78px] z-20 px-5 py-2.5 backdrop-blur-md flex items-center justify-between transition-colors duration-200 ${
              isDarkMode
                ? "bg-black/85 text-white"
                : "bg-[#f2f2f7]/85 text-neutral-900 border-b border-neutral-200/50"
            }`}
          >
            <h3 className="text-xl sm:text-2xl font-black tracking-tight">{group.dateTitle}</h3>
            <span
              className={`text-xs sm:text-sm font-bold px-3 py-1 rounded-full ${
                isDarkMode ? "bg-neutral-800 text-neutral-300" : "bg-neutral-200 text-neutral-700"
              }`}
            >
              {group.photos.length} ảnh
            </span>
          </div>

          {/* 3-Column Grid */}
          <div className="grid grid-cols-3 gap-1 px-1">
            {group.photos.map((photo) => {
              const isSelected =
                selectedPhotoIds.has(photo.id) || selectedPhotoIds.has(photo.messageId);
              const isRetrying = retryingIds.has(photo.messageId);
              const isFailed = failedIds.has(photo.messageId);

              const handleClick = () => {
                if (isSelectMode && onToggleSelectPhoto) {
                  onToggleSelectPhoto(photo);
                } else {
                  onSelectPhoto(photo);
                }
              };

              return (
                <div
                  key={photo.id}
                  onClick={handleClick}
                  className={`relative aspect-square overflow-hidden active:opacity-75 transition-all cursor-pointer group ${
                    isDarkMode ? "bg-neutral-900" : "bg-neutral-200"
                  } ${isSelectMode && isSelected ? "p-1 bg-blue-600 rounded-xl" : ""}`}
                >
                  {isRetrying ? (
                    <div className="w-full h-full flex flex-col items-center justify-center p-2 bg-neutral-800/80 text-neutral-400">
                      <RefreshCw className="w-5 h-5 animate-spin text-blue-400 mb-1" />
                      <span className="text-[10px] font-semibold text-center truncate">Đang nạp ảnh...</span>
                    </div>
                  ) : isFailed ? (
                    <div className="w-full h-full flex flex-col items-center justify-center p-2 bg-neutral-800/50 text-neutral-400">
                      <ImageIcon className="w-6 h-6 text-neutral-500 mb-1" />
                      <span className="text-[10px] text-center font-medium truncate max-w-full">
                        {photo.caption || "Ảnh đám mây"}
                      </span>
                    </div>
                  ) : (
                    <img
                      src={photo.thumbnailUrl || photo.url}
                      alt=""
                      onError={() => handleImageError(photo)}
                      className={`w-full h-full object-cover select-none pointer-events-none transform transition-transform ${
                        isSelectMode && isSelected ? "rounded-lg" : "group-active:scale-98"
                      }`}
                      loading="lazy"
                    />
                  )}

                  {/* Badge Carousel (Nhiều ảnh) */}
                  {photo.isCarousel && !isSelectMode && (
                    <div className="absolute top-1.5 right-1.5 p-1 rounded-md bg-black/60 backdrop-blur-sm text-white">
                      <Layers className="w-3.5 h-3.5" />
                    </div>
                  )}

                  {/* Checkbox khi ở Chế độ Chọn (Select Mode) */}
                  {isSelectMode && (
                    <div className="absolute top-2 right-2">
                      <div
                        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                          isSelected
                            ? "bg-blue-600 border-white text-white shadow-lg scale-105"
                            : "bg-black/40 border-white/80 text-transparent"
                        }`}
                      >
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
};
