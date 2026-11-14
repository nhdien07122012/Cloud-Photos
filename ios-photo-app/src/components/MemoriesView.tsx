import React, { useState, useEffect, useMemo } from "react";
import type { PhotoItem, PostAlbum } from "../types";
import {
  Sparkles,
  Play,
  Pause,
  X,
  Heart,
  Film,
  Shuffle,
  Maximize2,
  Layers,
  User,
  Flame,
  Camera,
} from "lucide-react";

interface MemoriesViewProps {
  photos: PhotoItem[];
  favorites: Set<string>;
  onToggleFavorite: (id: string) => void;
  postAlbums: PostAlbum[];
  isDarkMode?: boolean;
  onSelectPhoto: (p: PhotoItem) => void;
  featuredCreators: { author: string; count: number; cover: string }[];
  onOpenSearchAuthor?: (author: string) => void;
}

interface MemoryStory {
  id: string;
  title: string;
  subtitle: string;
  tag: string;
  icon?: string;
  coverPhoto: PhotoItem;
  photos: PhotoItem[];
}

export const MemoriesView: React.FC<MemoriesViewProps> = ({
  photos,
  favorites,
  onToggleFavorite,
  postAlbums,
  isDarkMode = true,
  onSelectPhoto,
  featuredCreators,
  onOpenSearchAuthor,
}) => {
  // Trình chiếu toàn màn hình (Story Slideshow Viewer)
  const [activeStory, setActiveStory] = useState<MemoryStory | null>(null);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [slideProgress, setSlideProgress] = useState(0); // 0 -> 100%

  // Sinh các nhóm kỷ niệm thông minh từ kho ảnh
  const memoryStories = useMemo<MemoryStory[]>(() => {
    if (!photos || photos.length === 0) return [];

    const now = new Date();
    const todayDate = now.getDate();
    const todayMonth = now.getMonth();
    const todayYear = now.getFullYear();

    const stories: MemoryStory[] = [];

    // 1. Ngày này năm xưa (On This Day)
    const onThisDayPhotos = photos.filter((p) => {
      if (!p.date) return false;
      const d = p.date;
      return (
        d.getDate() === todayDate &&
        d.getMonth() === todayMonth &&
        d.getFullYear() < todayYear
      );
    });

    if (onThisDayPhotos.length > 0) {
      const yearsAgo = todayYear - onThisDayPhotos[0].date.getFullYear();
      stories.push({
        id: "on-this-day",
        title: "Ngày này năm xưa",
        subtitle: `${yearsAgo} năm trước • ${todayDate} thg ${todayMonth + 1}`,
        tag: `${yearsAgo} NĂM TRƯỚC`,
        icon: "🕰️",
        coverPhoto: onThisDayPhotos[0],
        photos: onThisDayPhotos,
      });
    } else {
      // Fallback: Kỷ niệm cùng kỳ tháng này trong quá khứ hoặc ảnh của tháng này
      const sameMonthOldPhotos = photos.filter((p) => {
        if (!p.date) return false;
        return (
          p.date.getMonth() === todayMonth &&
          p.date.getFullYear() < todayYear
        );
      });
      if (sameMonthOldPhotos.length > 0) {
        stories.push({
          id: "same-month-past",
          title: `Tháng ${todayMonth + 1} những năm trước`,
          subtitle: `Dấu ấn quá khứ • ${sameMonthOldPhotos.length} khoảnh khắc`,
          tag: "DẤU ẤN XƯA",
          icon: "🕰️",
          coverPhoto: sameMonthOldPhotos[0],
          photos: sameMonthOldPhotos,
        });
      }
    }

    // 2. Khoảnh khắc gần đây (Recent Highlights)
    const sevenDaysAgo = Date.now() - 7 * 86400000;
    const recentPhotos = photos.filter(
      (p) => p.date && p.date.getTime() >= sevenDaysAgo
    );
    if (recentPhotos.length > 0) {
      stories.push({
        id: "recent-highlights",
        title: "Khoảnh khắc tuần qua",
        subtitle: `7 ngày gần đây • ${recentPhotos.length} ảnh mới`,
        tag: "GẦN ĐÂY",
        icon: "⚡",
        coverPhoto: recentPhotos[0],
        photos: recentPhotos.slice(0, 15),
      });
    }

    // 3. Mục yêu thích (Favorites Collection)
    const favPhotos = photos.filter(
      (p) =>
        favorites.has(String(p.id)) || favorites.has(String(p.messageId))
    );
    if (favPhotos.length > 0) {
      stories.push({
        id: "favorites-story",
        title: "Khoảnh khắc yêu thích",
        subtitle: `${favPhotos.length} ảnh đã thả tim ❤️`,
        tag: "YÊU THÍCH",
        icon: "💎",
        coverPhoto: favPhotos[0],
        photos: favPhotos,
      });
    }

    // 4. Kỷ niệm Mùa này / Tháng này (Seasonal / Month in review)
    const thisMonthPhotos = photos.filter((p) => {
      if (!p.date) return false;
      return (
        p.date.getMonth() === todayMonth &&
        p.date.getFullYear() === todayYear
      );
    });
    if (thisMonthPhotos.length > 0) {
      stories.push({
        id: "month-in-review",
        title: `Kỷ niệm Tháng ${todayMonth + 1}`,
        subtitle: `Những bức ảnh trong tháng ${todayMonth + 1}/${todayYear}`,
        tag: `THÁNG ${todayMonth + 1}`,
        icon: "🍂",
        coverPhoto: thisMonthPhotos[0],
        photos: thisMonthPhotos.slice(0, 20),
      });
    }

    // 5. Câu chuyện nhiều ảnh từ bài viết (Multi-photo posts)
    const multiPosts = postAlbums.filter((a) => a.photos.length > 1);
    if (multiPosts.length > 0) {
      const bestPost = multiPosts[0];
      stories.push({
        id: `post-${bestPost.id}`,
        title: bestPost.title || "Bộ ảnh chọn lọc",
        subtitle: `${bestPost.photos.length} ảnh cùng bộ • @${bestPost.author}`,
        tag: "CÂU CHUYỆN",
        icon: "📸",
        coverPhoto: bestPost.coverPhoto,
        photos: bestPost.photos,
      });
    }

    // 6. Toàn bộ kho ảnh ngẫu nhiên (Shuffle Story)
    if (photos.length > 2) {
      const shuffled = [...photos].sort(() => 0.5 - Math.random()).slice(0, 15);
      stories.push({
        id: "shuffle-story",
        title: "Lướt qua ký ức",
        subtitle: "Trình chiếu ngẫu nhiên các khoảnh khắc đẹp",
        tag: "KHÁM PHÁ",
        icon: "✨",
        coverPhoto: shuffled[0],
        photos: shuffled,
      });
    }

    return stories;
  }, [photos, favorites, postAlbums]);

  // Thước phim kỷ niệm tâm điểm (Hero Story)
  const heroStory = memoryStories.length > 0 ? memoryStories[0] : null;

  // Xử lý chạy tiến trình Story Slideshow
  useEffect(() => {
    if (!activeStory || isPaused) return;

    const SLIDE_DURATION_MS = 4000;
    const INTERVAL_MS = 50;
    const step = (INTERVAL_MS / SLIDE_DURATION_MS) * 100;

    const timer = setInterval(() => {
      setSlideProgress((prev) => {
        if (prev >= 100) {
          // Sang ảnh tiếp theo
          if (currentSlideIndex < activeStory.photos.length - 1) {
            setCurrentSlideIndex((idx) => idx + 1);
            return 0;
          } else {
            // Đã hết câu chuyện
            setActiveStory(null);
            return 0;
          }
        }
        return prev + step;
      });
    }, INTERVAL_MS);

    return () => clearInterval(timer);
  }, [activeStory, currentSlideIndex, isPaused]);

  // Bật mở Story
  const handleOpenStory = (story: MemoryStory, startIndex: number = 0) => {
    setActiveStory(story);
    setCurrentSlideIndex(startIndex);
    setSlideProgress(0);
    setIsPaused(false);
  };

  // Chuyển slide tiếp/trước
  const handleNextSlide = () => {
    if (!activeStory) return;
    if (currentSlideIndex < activeStory.photos.length - 1) {
      setCurrentSlideIndex((i) => i + 1);
      setSlideProgress(0);
    } else {
      setActiveStory(null);
    }
  };

  const handlePrevSlide = () => {
    if (!activeStory) return;
    if (currentSlideIndex > 0) {
      setCurrentSlideIndex((i) => i - 1);
      setSlideProgress(0);
    } else {
      setSlideProgress(0);
    }
  };

  // Khám phá ngẫu nhiên một câu chuyện
  const handleRandomExplore = () => {
    if (photos.length === 0) return;
    const randomPhotos = [...photos]
      .sort(() => 0.5 - Math.random())
      .slice(0, 12);
    handleOpenStory({
      id: "random-" + Date.now(),
      title: "Khoảnh khắc ngẫu nhiên",
      subtitle: "Bộ sưu tập ký ức tự động",
      tag: "BẤT NGỜ",
      icon: "🎲",
      coverPhoto: randomPhotos[0],
      photos: randomPhotos,
    });
  };

  // Lời chào theo buổi trong ngày
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Chào buổi sáng! Cùng ngắm lại những khoảnh khắc đẹp.";
    if (hour < 18) return "Chào buổi chiều! Những kỷ niệm đáng nhớ dành cho bạn.";
    return "Chào buổi tối! Thư giãn cùng những ký ức ngọt ngào.";
  }, []);

  return (
    <div className="space-y-7 pb-36 animate-in fade-in duration-300">
      {/* 1. HEADER & GREETING BANNER */}
      <div className="px-4 pt-1">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-2xl bg-gradient-to-tr from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/25">
                <Sparkles className="w-5 h-5" />
              </span>
              <h2 className="text-2xl font-black tracking-tight">Dành Cho Bạn</h2>
            </div>
            <p
              className={`text-xs sm:text-sm mt-1 font-medium ${
                isDarkMode ? "text-neutral-400" : "text-neutral-500"
              }`}
            >
              {greeting}
            </p>
          </div>

          {/* Nút hành động nhanh: Khám phá ngẫu nhiên */}
          <button
            onClick={handleRandomExplore}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold text-xs shadow-md shadow-purple-500/25 active:scale-95 transition-all shrink-0 cursor-pointer"
          >
            <Shuffle className="w-3.5 h-3.5" />
            <span>Ngẫu nhiên</span>
          </button>
        </div>

        {/* Status Chips Bar */}
        <div className="flex items-center gap-2 mt-3 overflow-x-auto scrollbar-none pb-1">
          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold shrink-0 border ${
              isDarkMode
                ? "bg-white/5 border-white/10 text-neutral-300"
                : "bg-black/5 border-black/10 text-neutral-700"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            <span>{memoryStories.length} câu chuyện kỷ niệm</span>
          </div>
          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold shrink-0 border ${
              isDarkMode
                ? "bg-white/5 border-white/10 text-neutral-300"
                : "bg-black/5 border-black/10 text-neutral-700"
            }`}
          >
            <Heart className="w-3.5 h-3.5 text-pink-500 fill-pink-500" />
            <span>{favorites.size} ảnh yêu thích</span>
          </div>
          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold shrink-0 border ${
              isDarkMode
                ? "bg-white/5 border-white/10 text-neutral-300"
                : "bg-black/5 border-black/10 text-neutral-700"
            }`}
          >
            <Camera className="w-3.5 h-3.5 text-emerald-400" />
            <span>{photos.length} ảnh trong kho</span>
          </div>
        </div>
      </div>

      {/* 2. HERO CINEMATIC MEMORY CARD (Thước phim kỷ niệm tâm điểm) */}
      {heroStory && (
        <div className="px-4">
          <div
            onClick={() => handleOpenStory(heroStory)}
            className="group relative h-80 sm:h-96 rounded-[32px] overflow-hidden cursor-pointer shadow-2xl transition-all duration-300 hover:shadow-purple-500/20 active:scale-[0.98] border border-white/10"
          >
            <img
              src={heroStory.coverPhoto.url}
              alt=""
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            />

            {/* Gradient Overlays */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-black/10" />

            {/* Top Badge */}
            <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
              <span className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/20 backdrop-blur-md text-white text-xs font-extrabold uppercase tracking-wider border border-white/20 shadow-md">
                <span>{heroStory.icon}</span>
                <span>{heroStory.tag}</span>
              </span>

              <span className="px-3 py-1.5 rounded-full bg-black/40 backdrop-blur-md text-neutral-200 text-xs font-semibold border border-white/10">
                {heroStory.photos.length} khoảnh khắc
              </span>
            </div>

            {/* Center Play Button Icon Overlay */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-16 h-16 rounded-full bg-white/25 backdrop-blur-xl border border-white/40 flex items-center justify-center text-white shadow-2xl shadow-black/60 group-hover:scale-110 group-hover:bg-purple-600/80 transition-all duration-300">
                <Play className="w-7 h-7 fill-white translate-x-0.5" />
              </div>
            </div>

            {/* Bottom Content Info */}
            <div className="absolute bottom-0 inset-x-0 p-5 sm:p-6 flex flex-col justify-end">
              <h3 className="text-2xl sm:text-3xl font-black text-white leading-tight drop-shadow-md">
                {heroStory.title}
              </h3>
              <p className="text-sm sm:text-base text-neutral-200 mt-1 font-medium drop-shadow">
                {heroStory.subtitle}
              </p>

              <div className="mt-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex -space-x-2">
                    {heroStory.photos.slice(0, 3).map((p, idx) => (
                      <img
                        key={idx}
                        src={p.url}
                        alt=""
                        className="w-7 h-7 rounded-full object-cover border-2 border-white shadow-sm"
                      />
                    ))}
                  </div>
                  <span className="text-xs text-neutral-300 font-semibold">
                    Chạm để phát thước phim
                  </span>
                </div>

                <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-purple-600 text-white text-xs font-bold shadow-lg shadow-purple-600/40">
                  <Play className="w-3.5 h-3.5 fill-white" />
                  <span>Phát</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. STORIES HORIZONTAL CAROUSEL (Dải Kỷ niệm Ngang dạng Reels/Stories) */}
      {memoryStories.length > 1 && (
        <div className="space-y-3">
          <div className="px-4 flex items-center justify-between">
            <h3 className="text-base font-extrabold flex items-center gap-2">
              <Film className="w-4 h-4 text-purple-400" />
              <span>Các cuộn kỷ niệm</span>
            </h3>
            <span
              className={`text-xs font-semibold ${
                isDarkMode ? "text-neutral-400" : "text-neutral-500"
              }`}
            >
              {memoryStories.length} cuộn
            </span>
          </div>

          <div className="flex gap-3 px-4 overflow-x-auto scrollbar-none pb-2 pt-1">
            {memoryStories.map((story) => (
              <div
                key={story.id}
                onClick={() => handleOpenStory(story)}
                className="group flex flex-col shrink-0 w-36 sm:w-40 cursor-pointer active:scale-95 transition-all"
              >
                {/* Story Card Image with Gradient Border */}
                <div className="relative h-48 sm:h-52 rounded-2xl overflow-hidden p-0.5 bg-gradient-to-tr from-purple-500 via-pink-500 to-amber-400 shadow-md group-hover:shadow-purple-500/25 transition-all">
                  <div className="relative w-full h-full rounded-[14px] overflow-hidden bg-neutral-900">
                    <img
                      src={story.coverPhoto.url}
                      alt=""
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-black/10" />

                    {/* Badge */}
                    <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-md text-white text-[10px] font-extrabold border border-white/10">
                      <span>{story.icon}</span>
                      <span className="truncate max-w-[80px]">{story.tag}</span>
                    </div>

                    {/* Small Play Button */}
                    <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white">
                      <Play className="w-2.5 h-2.5 fill-white translate-x-0.5" />
                    </div>

                    {/* Story Title & Count */}
                    <div className="absolute bottom-2 left-2 right-2">
                      <p className="text-white text-xs font-extrabold leading-tight line-clamp-2">
                        {story.title}
                      </p>
                      <p className="text-neutral-300 text-[10px] mt-0.5 font-medium">
                        {story.photos.length} ảnh
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. THEMED MEMORY MOSAICS (Các bộ sưu tập chủ đề dạng thẻ lớn) */}
      <div className="px-4 space-y-4">
        <h3 className="text-base font-extrabold flex items-center gap-2">
          <Layers className="w-4 h-4 text-pink-400" />
          <span>Bộ sưu tập nổi bật</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {memoryStories.slice(1, 5).map((story) => (
            <div
              key={story.id}
              onClick={() => handleOpenStory(story)}
              className={`rounded-3xl p-4 cursor-pointer transition-all active:scale-[0.98] border shadow-lg ${
                isDarkMode
                  ? "bg-[#1c1c1e] border-white/10 hover:border-purple-500/30"
                  : "bg-white border-black/5 hover:border-purple-500/20 shadow-neutral-200/50"
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{story.icon}</span>
                  <div>
                    <h4 className="font-bold text-sm sm:text-base leading-tight">
                      {story.title}
                    </h4>
                    <p
                      className={`text-xs mt-0.5 ${
                        isDarkMode ? "text-neutral-400" : "text-neutral-500"
                      }`}
                    >
                      {story.subtitle}
                    </p>
                  </div>
                </div>

                <div className="w-8 h-8 rounded-full bg-purple-600/15 text-purple-500 flex items-center justify-center shrink-0">
                  <Play className="w-3.5 h-3.5 fill-current translate-x-0.5" />
                </div>
              </div>

              {/* Mosaic 4-photo Preview */}
              <div className="grid grid-cols-2 gap-1.5 h-44 rounded-2xl overflow-hidden bg-neutral-900">
                {story.photos.slice(0, 4).map((p, idx) => (
                  <div key={idx} className="relative w-full h-full overflow-hidden">
                    <img
                      src={p.url}
                      alt=""
                      className="w-full h-full object-cover hover:scale-105 transition-transform"
                    />
                    {idx === 3 && story.photos.length > 4 && (
                      <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center text-white font-extrabold text-sm">
                        +{story.photos.length - 4}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 5. SPOTLIGHT PHOTOS MOSAIC (Kho ảnh khoảnh khắc ấn tượng) */}
      {photos.length > 0 && (
        <div className="px-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-extrabold flex items-center gap-2">
              <Flame className="w-4 h-4 text-amber-500" />
              <span>Khoảnh khắc ấn tượng</span>
            </h3>
            <span
              className={`text-xs font-semibold ${
                isDarkMode ? "text-neutral-400" : "text-neutral-500"
              }`}
            >
              Chọn lọc ngẫu nhiên
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 rounded-3xl overflow-hidden">
            {photos.slice(0, 6).map((photo, index) => (
              <div
                key={photo.id}
                onClick={() => onSelectPhoto(photo)}
                className={`relative group cursor-pointer overflow-hidden rounded-2xl bg-neutral-900 ${
                  index === 0
                    ? "col-span-2 row-span-2 h-64"
                    : "col-span-1 h-31"
                }`}
              >
                <img
                  src={photo.url}
                  alt=""
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2.5">
                  <p className="text-[11px] text-white font-semibold truncate">
                    {photo.caption || "Ảnh lưu trữ"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 6. FEATURED CREATORS (Tác giả lưu trữ nhiều nhất) */}
      {featuredCreators && featuredCreators.length > 0 && (
        <div className="px-4 space-y-3">
          <h3
            className={`text-base font-extrabold flex items-center gap-2 ${
              isDarkMode ? "text-neutral-200" : "text-neutral-800"
            }`}
          >
            <User className="w-4 h-4 text-blue-500" />
            <span>Tác giả lưu trữ nhiều nhất</span>
          </h3>

          <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-none">
            {featuredCreators.map((creator) => (
              <div
                key={creator.author}
                onClick={() => onOpenSearchAuthor && onOpenSearchAuthor(creator.author)}
                className="flex flex-col items-center shrink-0 w-20 cursor-pointer active:scale-95 transition-transform"
              >
                <div className="w-16 h-16 rounded-full overflow-hidden p-0.5 bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 mb-1.5 shadow-md">
                  <img
                    src={creator.cover}
                    alt=""
                    className="w-full h-full object-cover rounded-full bg-neutral-800"
                  />
                </div>
                <p className="text-xs font-bold truncate w-full text-center">
                  @{creator.author}
                </p>
                <span
                  className={`text-[10px] ${
                    isDarkMode ? "text-neutral-400" : "text-neutral-500"
                  }`}
                >
                  {creator.count} ảnh
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 7. FULLSCREEN CINEMATIC STORY SLIDESHOW VIEWER */}
      {activeStory && activeStory.photos.length > 0 && (
        <div
          className="fixed inset-0 z-50 bg-black flex flex-col justify-between select-none animate-in fade-in duration-200 overflow-hidden"
          onMouseDown={() => setIsPaused(true)}
          onMouseUp={() => setIsPaused(false)}
          onTouchStart={() => setIsPaused(true)}
          onTouchEnd={() => setIsPaused(false)}
        >
          {/* Top Segmented Story Progress Bars */}
          <div
            className="absolute top-0 inset-x-0 z-20 px-4 pb-4 bg-gradient-to-b from-black/95 via-black/70 to-transparent pointer-events-auto"
            style={{
              paddingTop: "max(calc(var(--sat, 0px) + 12px), 52px)",
            }}
          >
            {/* Bars Container */}
            <div className="flex gap-1.5 items-center mb-3.5">
              {activeStory.photos.map((_, idx) => (
                <div
                  key={idx}
                  className="flex-1 h-1 rounded-full bg-white/25 overflow-hidden backdrop-blur-sm"
                >
                  <div
                    className="h-full bg-white transition-all duration-75 rounded-full shadow-sm"
                    style={{
                      width:
                        idx < currentSlideIndex
                          ? "100%"
                          : idx === currentSlideIndex
                          ? `${slideProgress}%`
                          : "0%",
                    }}
                  />
                </div>
              ))}
            </div>

            {/* Story Header info and actions */}
            <div className="flex items-center justify-between text-white">
              <div className="flex items-center gap-2.5 min-w-0 pr-3">
                <span className="text-xl shrink-0 p-1 rounded-xl bg-white/10 backdrop-blur-md border border-white/15">
                  {activeStory.icon || "✨"}
                </span>
                <div className="min-w-0">
                  <h4 className="text-sm sm:text-base font-extrabold leading-tight drop-shadow truncate">
                    {activeStory.title}
                  </h4>
                  <p className="text-[11px] sm:text-xs text-neutral-300 font-medium drop-shadow truncate mt-0.5">
                    {activeStory.photos[currentSlideIndex]?.date?.toLocaleDateString(
                      "vi-VN",
                      { day: "numeric", month: "short", year: "numeric" }
                    ) || activeStory.subtitle}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {/* Pause/Play Button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsPaused(!isPaused);
                  }}
                  className="w-9 h-9 rounded-full bg-black/50 backdrop-blur-md flex items-center justify-center text-white border border-white/25 active:scale-90 transition-all cursor-pointer shadow-lg"
                  title={isPaused ? "Tiếp tục" : "Tạm dừng"}
                >
                  {isPaused ? (
                    <Play className="w-4 h-4 fill-white ml-0.5" />
                  ) : (
                    <Pause className="w-4 h-4 fill-white" />
                  )}
                </button>

                {/* Close Button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveStory(null);
                  }}
                  className="w-9 h-9 rounded-full bg-black/50 backdrop-blur-md flex items-center justify-center text-white border border-white/25 active:scale-90 transition-all cursor-pointer shadow-lg"
                  title="Đóng câu chuyện"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Main Story Image with Ken Burns zoom animation */}
          <div className="relative flex-1 w-full h-full flex items-center justify-center bg-black overflow-hidden">
            <img
              key={currentSlideIndex}
              src={activeStory.photos[currentSlideIndex]?.url}
              alt=""
              className="w-full h-full object-contain animate-in zoom-in-95 duration-500 transition-transform ease-out"
            />

            {/* Click Navigators Left & Right */}
            <div
              onClick={handlePrevSlide}
              className="absolute left-0 inset-y-0 w-1/3 z-10 cursor-pointer"
            />
            <div
              onClick={handleNextSlide}
              className="absolute right-0 inset-y-0 w-1/3 z-10 cursor-pointer"
            />
          </div>

          {/* Bottom Story Controls & Info */}
          <div
            className="absolute bottom-0 inset-x-0 z-20 px-5 pt-4 bg-gradient-to-t from-black/95 via-black/60 to-transparent flex items-center justify-between text-white"
            style={{
              paddingBottom: "max(calc(var(--sab, 0px) + 20px), 36px)",
            }}
          >
            <div className="flex-1 pr-4 min-w-0">
              <p className="text-xs text-neutral-300 font-semibold truncate">
                @{activeStory.photos[currentSlideIndex]?.author || "Telegram"} • Ảnh {currentSlideIndex + 1}/{activeStory.photos.length}
              </p>
              <h5 className="text-sm sm:text-base font-bold mt-0.5 line-clamp-2 drop-shadow">
                {activeStory.photos[currentSlideIndex]?.caption || "Khoảnh khắc kỷ niệm"}
              </h5>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              {/* Toggle Favorite */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  const photo = activeStory.photos[currentSlideIndex];
                  if (photo) onToggleFavorite(String(photo.id));
                }}
                className="w-11 h-11 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center active:scale-90 transition-all cursor-pointer border border-white/25 shadow-lg"
                title="Yêu thích"
              >
                <Heart
                  className={`w-5 h-5 ${
                    favorites.has(String(activeStory.photos[currentSlideIndex]?.id)) ||
                    favorites.has(String(activeStory.photos[currentSlideIndex]?.messageId))
                      ? "text-red-500 fill-red-500"
                      : "text-white"
                  }`}
                />
              </button>

              {/* Fullscreen Photo Viewer */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  const photo = activeStory.photos[currentSlideIndex];
                  if (photo) {
                    setActiveStory(null);
                    onSelectPhoto(photo);
                  }
                }}
                className="w-11 h-11 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center active:scale-90 transition-all cursor-pointer border border-white/25 shadow-lg text-white"
                title="Xem chi tiết"
              >
                <Maximize2 className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
