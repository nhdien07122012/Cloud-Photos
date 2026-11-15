import React, { useState, useEffect, useRef } from "react";
import type { PhotoItem, TelegramConfig } from "../types";
import {
  ChevronLeft,
  Share2,
  Heart,
  Info,
  Download,
  ExternalLink,
  X,
  ChevronRight,
  RefreshCw,
  Sparkles,
  Trash2,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { Share } from "@capacitor/share";
import { fetchFullResolutionPhoto } from "../services/telegramClient";

interface PhotoViewerProps {
  photo: PhotoItem | null;
  allPhotos: PhotoItem[];
  config: TelegramConfig;
  isFavorite: boolean;
  onToggleFavorite: (id: string) => void;
  onClose: () => void;
  onSelectPhoto: (p: PhotoItem) => void;
  onDeletePhoto?: (messageId: number) => Promise<void>;
}

export const PhotoViewer: React.FC<PhotoViewerProps> = ({
  photo,
  allPhotos,
  config,
  isFavorite,
  onToggleFavorite,
  onClose,
  onSelectPhoto,
  onDeletePhoto,
}) => {
  const [showInfo, setShowInfo] = useState(false);
  const [uiVisible, setUiVisible] = useState(true);
  const [hdUrl, setHdUrl] = useState<string | null>(null);
  const [loadingHd, setLoadingHd] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Zoom & Pan state
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isGesturing, setIsGesturing] = useState(false);

  // Landscape orientation detection
  const [isLandscape, setIsLandscape] = useState(
    typeof window !== "undefined" ? window.innerWidth > window.innerHeight : false
  );

  useEffect(() => {
    const checkOrientation = () => {
      setIsLandscape(window.innerWidth > window.innerHeight);
    };
    checkOrientation();
    window.addEventListener("resize", checkOrientation);
    window.addEventListener("orientationchange", checkOrientation);
    return () => {
      window.removeEventListener("resize", checkOrientation);
      window.removeEventListener("orientationchange", checkOrientation);
    };
  }, []);

  // Dedicated Zoom toggle handler (1x -> 2.2x -> 3.5x -> 1x)
  const handleToggleZoom = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (photo?.isVideo) return;

    if (scale === 1) {
      setScale(2.2);
      setPosition({ x: 0, y: 0 });
      setSwipeOffset(0);
      showToast("Đã phóng to 2.2x • Vuốt để di chuyển");
    } else if (scale < 3) {
      setScale(3.5);
      setPosition({ x: 0, y: 0 });
      setSwipeOffset(0);
      showToast("Đã phóng to cực đại 3.5x");
    } else {
      setScale(1);
      setPosition({ x: 0, y: 0 });
      setSwipeOffset(0);
      showToast("Đã thu nhỏ về 1x");
    }
  };

  // Swipe left/right state
  const [swipeOffset, setSwipeOffset] = useState(0);
  const swipeStartRef = useRef<{ x: number; y: number; time: number }>({ x: 0, y: 0, time: 0 });
  const isSwipeGestureRef = useRef<boolean>(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartRef = useRef<{ dist: number; scale: number; x: number; y: number; touches: number }>({
    dist: 0,
    scale: 1,
    x: 0,
    y: 0,
    touches: 0,
  });
  const lastTapRef = useRef<number>(0);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => {
      setToast(null);
    }, 2800);
  };

  // Reset zoom & pan when switching photo
  useEffect(() => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
    setSwipeOffset(0);
    isSwipeGestureRef.current = false;
    let active = true;
    setHdUrl(null);
    if (!photo) return;

    setLoadingHd(true);
    fetchFullResolutionPhoto(config, photo.messageId).then((url) => {
      if (active && url) {
        setHdUrl(url);
      }
      if (active) setLoadingHd(false);
    });

    return () => {
      active = false;
    };
  }, [photo?.id, photo?.messageId]);

  if (!photo) return null;

  const currentIndex = allPhotos.findIndex((p) => p.id === photo.id);
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < allPhotos.length - 1;

  const handlePrev = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (hasPrev) onSelectPhoto(allPhotos[currentIndex - 1]);
  };

  const handleNext = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (hasNext) onSelectPhoto(allPhotos[currentIndex + 1]);
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") handlePrev();
      if (e.key === "ArrowRight") handleNext();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentIndex, hasPrev, hasNext]);

  // Touch Handlers for Pinch to Zoom, Pan & Swipe Left/Right
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      // 2 fingers: Pinch to zoom
      setIsGesturing(true);
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      touchStartRef.current = {
        dist,
        scale,
        x: position.x,
        y: position.y,
        touches: 2,
      };
    } else if (e.touches.length === 1) {
      const now = Date.now();
      const touch = e.touches[0];

      // Double tap: toggle zoom 1x <-> 2.5x
      if (now - lastTapRef.current < 300) {
        if (scale > 1.1) {
          setScale(1);
          setPosition({ x: 0, y: 0 });
          setSwipeOffset(0);
        } else {
          setScale(2.5);
          setPosition({ x: 0, y: 0 });
          setSwipeOffset(0);
        }
        lastTapRef.current = 0;
        return;
      }
      lastTapRef.current = now;

      if (scale > 1) {
        // Panning when zoomed in
        setIsGesturing(true);
        touchStartRef.current = {
          dist: 0,
          scale,
          x: touch.clientX - position.x,
          y: touch.clientY - position.y,
          touches: 1,
        };
      } else {
        // Normal 1x: Prepare for horizontal swipe between photos
        swipeStartRef.current = {
          x: touch.clientX,
          y: touch.clientY,
          time: now,
        };
        isSwipeGestureRef.current = false;
      }
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && touchStartRef.current.touches === 2) {
      e.preventDefault();
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      if (touchStartRef.current.dist > 0) {
        const factor = dist / touchStartRef.current.dist;
        const newScale = Math.min(Math.max(touchStartRef.current.scale * factor, 0.9), 4.5);
        setScale(newScale);
      }
    } else if (e.touches.length === 1 && scale > 1) {
      e.preventDefault();
      const newX = e.touches[0].clientX - touchStartRef.current.x;
      const newY = e.touches[0].clientY - touchStartRef.current.y;
      const maxOffsetX = (window.innerWidth * 0.55) * (scale - 1);
      const maxOffsetY = (window.innerHeight * 0.55) * (scale - 1);
      setPosition({
        x: Math.min(Math.max(newX, -maxOffsetX), maxOffsetX),
        y: Math.min(Math.max(newY, -maxOffsetY), maxOffsetY),
      });
    } else if (e.touches.length === 1 && scale === 1) {
      const touch = e.touches[0];
      const deltaX = touch.clientX - swipeStartRef.current.x;
      const deltaY = touch.clientY - swipeStartRef.current.y;

      // Determine if gesture is horizontal swipe
      if (!isSwipeGestureRef.current) {
        if (Math.abs(deltaX) > 8 && Math.abs(deltaX) > Math.abs(deltaY) * 1.1) {
          isSwipeGestureRef.current = true;
          setIsGesturing(true);
        }
      }

      if (isSwipeGestureRef.current) {
        e.preventDefault();
        // Rubber-band resistance at start and end
        let effectiveOffset = deltaX;
        if (!hasPrev && deltaX > 0) {
          effectiveOffset = deltaX * 0.3;
        } else if (!hasNext && deltaX < 0) {
          effectiveOffset = deltaX * 0.3;
        }
        setSwipeOffset(effectiveOffset);
      }
    }
  };

  const handleTouchEnd = () => {
    setIsGesturing(false);

    if (scale < 1.05) {
      setScale(1);
      setPosition({ x: 0, y: 0 });
    }

    if (isSwipeGestureRef.current) {
      isSwipeGestureRef.current = false;
      const duration = Date.now() - swipeStartRef.current.time;
      const velocity = Math.abs(swipeOffset) / Math.max(duration, 1);

      const isQuickFlick = Math.abs(swipeOffset) > 20 && velocity > 0.35;
      const isDragPassed = Math.abs(swipeOffset) > 50;

      if (swipeOffset < 0 && (isDragPassed || isQuickFlick)) {
        // Vuốt sang trái -> Xem ảnh tiếp theo
        if (hasNext) {
          handleNext();
        }
      } else if (swipeOffset > 0 && (isDragPassed || isQuickFlick)) {
        // Vuốt sang phải -> Xem ảnh trước đó
        if (hasPrev) {
          handlePrev();
        }
      }

      setSwipeOffset(0);
    }
  };

  // Tải ảnh hoặc video về máy iPhone (Hỗ trợ iOS Camera Roll)
  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const isVideo = photo.isVideo;
    showToast(isVideo ? "Đang chuẩn bị video..." : "Đang chuẩn bị ảnh chất lượng cao...");

    try {
      const targetUrl = hdUrl || photo.url;
      const res = await fetch(targetUrl);
      const blob = await res.blob();
      const ext = isVideo ? "mp4" : "jpg";
      const mime = isVideo ? "video/mp4" : "image/jpeg";
      const file = new File(
        [blob],
        `cloudphotos_${photo.author || (isVideo ? "video" : "photo")}_${Date.now()}.${ext}`,
        { type: mime }
      );

      // Cách 1: Native Web Share File (Mở menu iOS chứa nút 'Lưu video' / 'Lưu hình ảnh' vào Thư viện)
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: isVideo ? "Lưu Video vào Thư viện" : "Lưu vào Thư viện ảnh",
        });
        showToast(isVideo ? "👉 Chọn 'Lưu video' vào Thư viện iPhone" : "👉 Chọn 'Lưu hình ảnh' để lưu vào Thư viện iPhone");
        return;
      }
    } catch (err: any) {
      if (err.name !== "AbortError") {
        console.warn("Share download error:", err);
      }
    }

    // Cách 2: Browser download fallback (trình duyệt máy tính hoặc Android)
    try {
      const isVideo = photo.isVideo;
      const ext = isVideo ? "mp4" : "jpg";
      const a = document.createElement("a");
      a.href = hdUrl || photo.url;
      a.download = `cloudphotos_${photo.author || (isVideo ? "video" : "photo")}_${Date.now()}.${ext}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      showToast(isVideo ? "Đã tải video về máy" : "Đã tải ảnh về máy");
    } catch {
      showToast("Mẹo: Nhấn giữ vào ảnh/video và chọn 'Lưu vào Ảnh'");
    }
  };

  // Chia sẻ ảnh (Native iOS Share Sheet)
  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();

    // 1. Chia sẻ File ảnh qua Web Share API
    try {
      const targetUrl = hdUrl || photo.url;
      const res = await fetch(targetUrl);
      const blob = await res.blob();
      const file = new File(
        [blob],
        `instagram_${photo.author || "photo"}.jpg`,
        { type: "image/jpeg" }
      );

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `Ảnh từ @${photo.author || "Instagram"}`,
          text: photo.caption,
        });
        return;
      }
    } catch {}

    // 2. Chia sẻ link qua Capacitor Native Share
    try {
      await Share.share({
        title: `Ảnh từ @${photo.author || "Instagram"}`,
        text: photo.caption || "Ảnh từ Instagram",
        url: photo.originalUrl || undefined,
        dialogTitle: "Chia sẻ ảnh",
      });
      return;
    } catch {}

    // 3. Sao chép link nếu không mở được share
    if (photo.originalUrl) {
      try {
        await navigator.clipboard.writeText(photo.originalUrl);
        showToast("Đã sao chép liên kết Instagram!");
      } catch {}
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black select-none overflow-hidden touch-none">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-16 landscape:top-10 inset-x-0 mx-auto w-fit z-50 px-4 py-2 bg-neutral-800/95 border border-neutral-700/80 backdrop-blur-xl text-white text-xs font-medium rounded-full shadow-2xl animate-in fade-in duration-200">
          {toast}
        </div>
      )}

      {/* Top Header Bar */}
      <div
        className={`absolute top-0 inset-x-0 z-20 flex items-center justify-between transition-all duration-300 ${
          isLandscape
            ? "h-14 pt-1 pb-1 bg-gradient-to-b from-black/90 via-black/50 to-transparent"
            : "pt-[var(--sat)] h-20 bg-black/60 backdrop-blur-md"
        } ${
          uiVisible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-4 pointer-events-none"
        }`}
        style={{
          paddingLeft: "max(var(--sal), 1rem)",
          paddingRight: "max(var(--sar), 1rem)",
        }}
      >
        <button
          onClick={onClose}
          className="flex items-center text-blue-400 active:opacity-60 text-sm sm:text-base font-medium py-2 pr-3"
        >
          <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6 mr-0.5" />
          <span>Thư viện</span>
        </button>

        <div className="text-center px-2">
          <p className="text-xs sm:text-sm font-semibold text-white truncate max-w-[200px] sm:max-w-xs">
            {photo.date.toLocaleDateString("vi-VN", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </p>
          <div className="flex items-center justify-center gap-1.5 mt-0.5">
            <p className="text-[11px] sm:text-xs text-neutral-400 font-medium">
              {currentIndex + 1} / {allPhotos.length}
            </p>
            {hdUrl && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.2 bg-emerald-950/80 border border-emerald-500/40 text-[10px] text-emerald-300 font-medium rounded-full">
                <Sparkles className="w-2.5 h-2.5 text-emerald-400" />
                HD
              </span>
            )}
            {loadingHd && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.2 bg-blue-950/80 border border-blue-500/40 text-[10px] text-blue-300 font-medium rounded-full">
                <RefreshCw className="w-2.5 h-2.5 animate-spin text-blue-400" />
                HD...
              </span>
            )}
          </div>
        </div>

        <button
          onClick={handleShare}
          className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-full bg-neutral-800/80 text-blue-400 active:opacity-60 backdrop-blur-sm"
          title="Chia sẻ ảnh"
        >
          <Share2 className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>
      </div>

      {/* Main Photo Center Container with Pinch to Zoom */}
      <div
        ref={containerRef}
        onClick={() => {
          if (scale === 1) setUiVisible(!uiVisible);
        }}
        onDoubleClick={handleToggleZoom}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className="absolute inset-0 w-full h-full flex items-center justify-center overflow-hidden cursor-pointer touch-none z-10"
      >
        {photo.isVideo ? (
          <div
            className="w-full h-full flex items-center justify-center p-2 z-10"
            onClick={(e) => e.stopPropagation()}
          >
            <video
              src={hdUrl || photo.url}
              poster={photo.thumbnailUrl}
              controls
              playsInline
              autoPlay
              loop
              className="max-w-full max-h-full sm:rounded-2xl shadow-2xl object-contain pointer-events-auto"
            />
          </div>
        ) : (
          <img
            src={hdUrl || photo.url}
            alt={photo.caption || "Fullscreen view"}
            style={{
              transform: `scale(${scale}) translate(${(position.x + swipeOffset) / scale}px, ${position.y / scale}px)`,
              transition: isGesturing ? "none" : "transform 0.25s cubic-bezier(0.2, 0, 0, 1)",
              WebkitTouchCallout: "default",
            }}
            className="max-w-full max-h-full object-contain pointer-events-auto select-none"
          />
        )}

        {/* Navigation Arrows for Mobile & Desktop */}
        {hasPrev && scale === 1 && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              handlePrev();
            }}
            style={{ left: "max(var(--sal), 0.75rem)" }}
            className={`absolute top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/60 border border-neutral-700/60 text-white active:scale-90 backdrop-blur-md z-20 transition-all flex items-center justify-center ${
              uiVisible ? "opacity-100" : "opacity-0 pointer-events-none"
            }`}
            title="Ảnh trước"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
        )}
        {hasNext && scale === 1 && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleNext();
            }}
            style={{ right: "max(var(--sar), 0.75rem)" }}
            className={`absolute top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/60 border border-neutral-700/60 text-white active:scale-90 backdrop-blur-md z-20 transition-all flex items-center justify-center ${
              uiVisible ? "opacity-100" : "opacity-0 pointer-events-none"
            }`}
            title="Ảnh tiếp theo"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        )}
      </div>

      {/* Floating Zoom Indicator Pill */}
      {scale > 1 && (
        <button
          onClick={handleToggleZoom}
          className="absolute bottom-22 landscape:bottom-16 inset-x-0 mx-auto w-fit z-30 px-3.5 py-1.5 bg-black/85 border border-white/20 backdrop-blur-md text-white text-xs font-semibold rounded-full shadow-2xl flex items-center gap-1.5 active:scale-95 transition-all"
          title="Nhấn để thu nhỏ về 1x"
        >
          <ZoomOut className="w-3.5 h-3.5 text-blue-400" />
          <span>{scale.toFixed(1)}x • Chạm để thu nhỏ</span>
        </button>
      )}

      {/* Bottom Action Bar (Apple Photos style) */}
      <div
        className={`absolute bottom-0 inset-x-0 z-20 flex items-center justify-between transition-all duration-300 ${
          isLandscape
            ? "h-14 pb-1 pt-1 bg-gradient-to-t from-black/90 via-black/60 to-transparent"
            : "pb-[var(--sab)] h-20 bg-black/60 backdrop-blur-md"
        } ${
          uiVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"
        }`}
        style={{
          paddingLeft: isLandscape ? "max(var(--sal), 2.5rem)" : "2rem",
          paddingRight: isLandscape ? "max(var(--sar), 2.5rem)" : "2rem",
        }}
      >
        {/* Nút Trái tim (Yêu thích) */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite(String(photo.id));
            showToast(isFavorite ? "Đã xóa khỏi Mục yêu thích" : "Đã thêm vào Mục yêu thích ❤️");
          }}
          className={`p-2 transition-transform active:scale-125 ${
            isFavorite ? "text-red-500" : "text-neutral-300"
          }`}
          title="Yêu thích ảnh"
        >
          <Heart className={`w-6 h-6 ${isFavorite ? "fill-red-500 text-red-500 scale-110" : ""}`} />
        </button>

        {/* Nút Phóng to / Thu nhỏ ảnh */}
        {!photo.isVideo && (
          <button
            onClick={handleToggleZoom}
            className={`p-2 transition-transform active:scale-125 ${
              scale > 1 ? "text-blue-400" : "text-neutral-300 active:opacity-60"
            }`}
            title={scale > 1 ? "Thu nhỏ về 1x" : "Phóng to ảnh"}
          >
            {scale > 1 ? (
              <ZoomOut className="w-6 h-6 text-blue-400" />
            ) : (
              <ZoomIn className="w-6 h-6 text-neutral-300" />
            )}
          </button>
        )}

        {/* Nút Thông tin (i) */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowInfo(true);
          }}
          className="p-2 text-neutral-300 active:opacity-60"
          title="Chi tiết ảnh"
        >
          <Info className="w-6 h-6" />
        </button>

        {/* Nút Tải về máy */}
        <button
          onClick={handleDownload}
          className="p-2 text-neutral-300 active:opacity-60"
          title="Tải ảnh về máy"
        >
          <Download className="w-6 h-6" />
        </button>

        {/* Nút Xóa ảnh (Thùng rác chuẩn iOS) */}
        {onDeletePhoto && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsConfirmDeleteOpen(true);
            }}
            className="p-2 text-neutral-400 hover:text-red-400 active:text-red-500 transition-colors"
            title="Xóa ảnh khỏi kho lưu trữ"
          >
            <Trash2 className="w-6 h-6" />
          </button>
        )}
      </div>

      {/* Info Bottom Sheet */}
      {showInfo && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute inset-x-0 bottom-0 z-40 bg-neutral-900/95 backdrop-blur-2xl rounded-t-3xl p-6 border-t border-neutral-800 text-white max-h-[80vh] overflow-y-auto animate-in slide-in-from-bottom duration-300"
          style={{
            paddingLeft: "max(var(--sal), 1.5rem)",
            paddingRight: "max(var(--sar), 1.5rem)",
          }}
        >
          <div className="flex items-center justify-between pb-4 border-b border-neutral-800">
            <h3 className="text-lg font-bold">Chi tiết ảnh Instagram</h3>
            <button
              onClick={() => setShowInfo(false)}
              className="w-8 h-8 rounded-full bg-neutral-800 flex items-center justify-center text-neutral-400 active:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-4 pt-4 text-sm">
            {photo.author && (
              <div>
                <p className="text-neutral-400 text-xs">Tác giả Instagram</p>
                <p className="font-semibold text-blue-400">@{photo.author}</p>
              </div>
            )}

            {photo.caption && (
              <div>
                <p className="text-neutral-400 text-xs mb-1">Nội dung bài viết (Caption)</p>
                <p className="text-neutral-200 text-xs leading-relaxed bg-neutral-800/60 p-3 rounded-xl border border-neutral-800 font-normal">
                  {photo.caption}
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="bg-neutral-800/40 p-3 rounded-xl border border-neutral-800">
                <p className="text-neutral-400 text-xs">Ngày lưu trữ</p>
                <p className="text-xs font-medium text-white mt-0.5">
                  {photo.date.toLocaleDateString("vi-VN", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </p>
              </div>

              <div className="bg-neutral-800/40 p-3 rounded-xl border border-neutral-800">
                <p className="text-neutral-400 text-xs">Mã tin nhắn Kênh</p>
                <p className="text-xs font-mono text-neutral-300 mt-0.5">
                  #{photo.messageId}
                </p>
              </div>
            </div>

            {photo.originalUrl && (
              <div className="pt-2">
                <a
                  href={photo.originalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-3 bg-gradient-to-r from-pink-600 to-purple-600 rounded-xl font-medium text-white text-xs flex items-center justify-center gap-1.5 active:opacity-80 shadow-md"
                >
                  <span>Mở bài viết gốc trên Instagram</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            )}
          </div>
        </div>
      )}

      {/* iOS Style Action Sheet Xác Nhận Xóa Ảnh */}
      {isConfirmDeleteOpen && (
        <div
          onClick={(e) => {
            e.stopPropagation();
            if (!isDeleting) setIsConfirmDeleteOpen(false);
          }}
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 animate-in fade-in duration-200"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm bg-[#1c1c1e] border border-neutral-800 rounded-2xl overflow-hidden text-center shadow-2xl p-4 space-y-3 animate-in zoom-in-95 duration-200"
          >
            <div>
              <h4 className="text-base font-bold text-white">Xóa ảnh này?</h4>
              <p className="text-xs text-neutral-400 mt-1 leading-relaxed px-2">
                Ảnh sẽ bị xóa khỏi bộ nhớ máy và xóa vĩnh viễn trên Kênh Telegram của bạn.
              </p>
            </div>

            <div className="pt-2 space-y-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={async () => {
                  if (!onDeletePhoto || !photo) return;
                  setIsDeleting(true);
                  try {
                    const nextTarget = hasNext
                      ? allPhotos[currentIndex + 1]
                      : hasPrev
                      ? allPhotos[currentIndex - 1]
                      : null;

                    await onDeletePhoto(photo.messageId);
                    showToast("Đã xóa ảnh thành công 🗑️");
                    setIsConfirmDeleteOpen(false);

                    if (nextTarget) {
                      onSelectPhoto(nextTarget);
                    } else {
                      onClose();
                    }
                  } catch (err: any) {
                    showToast("Lỗi khi xóa ảnh: " + (err.message || "Thử lại sau"));
                  } finally {
                    setIsDeleting(false);
                  }
                }}
                className="w-full py-3 bg-red-600 text-white font-bold rounded-xl text-sm flex items-center justify-center gap-2 active:bg-red-700 transition-colors disabled:opacity-50"
              >
                {isDeleting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Đang xóa...</span>
                  </>
                ) : (
                  "Xóa ảnh"
                )}
              </button>

              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setIsConfirmDeleteOpen(false)}
                className="w-full py-3 bg-neutral-800 text-white font-semibold rounded-xl text-sm active:bg-neutral-700 transition-colors"
              >
                Hủy
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
