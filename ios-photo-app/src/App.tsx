import React, { useState, useEffect, useMemo, useRef } from "react";
import { App as CapApp } from "@capacitor/app";
import type { PhotoItem, DateGroup, TelegramConfig, PostAlbum, ThemeMode, UserAlbum } from "./types";
import {
  getStoredConfig,
  saveStoredConfig,
  fetchChannelPhotos,
  deleteTelegramPhoto,
  deleteMultipleTelegramPhotos,
} from "./services/telegramClient";
import {
  getCachedPhotosFromDB,
  removePhotoFromCache,
  removeMultiplePhotosFromCache,
} from "./services/photoStorage";
import { uploadPhotosToTelegram, type UploadProgress } from "./services/uploadService";
import { runAutoSync } from "./services/autoSyncService";
import {
  getUserAlbums,
  createNewAlbum,
  addPhotosToAlbum,
  removePhotoFromAlbum,
  deleteAlbum,
  getPhotosInAlbum,
  getAlbumCoverUrl,
} from "./services/albumStorage";
import { Header } from "./components/Header";
import { PhotoGrid } from "./components/PhotoGrid";
import { PhotoViewer } from "./components/PhotoViewer";
import { TabBar } from "./components/TabBar";
import { SettingsModal } from "./components/SettingsModal";
import {
  RefreshCw,
  Search,
  Folder,
  Sparkles,
  ShieldCheck,
  ChevronRight,
  AlertCircle,
  Heart,
  Layers,
  ChevronLeft,
  User,
  Calendar,
  UploadCloud,
  Camera,
  Image as ImageIcon,
  CheckCircle2,
  FolderPlus,
  Plus,
  Check,
  Trash2,
  ImagePlus,
} from "lucide-react";

export const App: React.FC = () => {
  const [config, setConfig] = useState<TelegramConfig>(getStoredConfig);
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<PhotoItem | null>(null);
  const [currentTab, setCurrentTab] = useState("library");
  const [activeFilter, setActiveFilter] = useState("Tất cả");
  const [sortBy, setSortBy] = useState<"added" | "date">("date");
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAlbum, setSelectedAlbum] = useState<PostAlbum | null>(null);

  // Chế độ Chọn Nhiều Ảnh (Select Mode)
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedPhotoIds, setSelectedPhotoIds] = useState<Set<string | number>>(new Set());
  const [isConfirmDeleteBatchOpen, setIsConfirmDeleteBatchOpen] = useState(false);
  const [isDeletingBatch, setIsDeletingBatch] = useState(false);

  // User Custom Albums State
  const [userAlbums, setUserAlbums] = useState<UserAlbum[]>(getUserAlbums);
  const [selectedUserAlbum, setSelectedUserAlbum] = useState<UserAlbum | null>(null);
  const [isCreateAlbumModalOpen, setIsCreateAlbumModalOpen] = useState(false);
  const [albumNameInput, setAlbumNameInput] = useState("");
  const [isAddPhotosModalOpen, setIsAddPhotosModalOpen] = useState(false);
  const [selectedPhotoIdsForAlbum, setSelectedPhotoIdsForAlbum] = useState<Set<string | number>>(new Set());

  // Auto-Sync Background State & Engine
  const [autoSync, setAutoSync] = useState<boolean>(() => {
    return localStorage.getItem("cloud_photos_auto_sync") === "true";
  });
  const [isAutoSyncing, setIsAutoSyncing] = useState(false);
  const [autoSyncStatusText, setAutoSyncStatusText] = useState("");
  const isSyncingRef = useRef(false);

  const executeAutoSync = async (notify = true) => {
    if (isSyncingRef.current) return;
    if (!config.isLoggedIn && !config.sessionString) {
      if (notify) showToast("Vui lòng kết nối tài khoản Telegram để sao lưu");
      return;
    }
    isSyncingRef.current = true;
    setIsAutoSyncing(true);
    setAutoSyncStatusText("Đang kiểm tra thư viện iPhone...");
    try {
      const res = await runAutoSync(
        config,
        (current, total, file) => {
          setAutoSyncStatusText(`Đang sao lưu ${current}/${total}: ${file}`);
        },
        photos // Đối soát với danh sách ảnh đang có trên Telegram
      );
      if (res.syncedCount > 0) {
        showToast(res.message);
        if (res.newUploadedPhotos && res.newUploadedPhotos.length > 0) {
          setPhotos((prev) => {
            const existingIds = new Set(prev.map((p) => p.messageId));
            const fresh = res.newUploadedPhotos!.filter((p) => !existingIds.has(p.messageId));
            return [...fresh, ...prev];
          });
        } else {
          loadPhotos(true);
        }
      } else if (notify) {
        showToast(res.message);
      }
    } catch (e: any) {
      console.error("Auto sync trigger error:", e);
      if (notify) showToast("Lỗi đồng bộ tự động: " + (e.message || ""));
    } finally {
      isSyncingRef.current = false;
      setIsAutoSyncing(false);
      setAutoSyncStatusText("");
    }
  };

  const handleAutoSyncChange = (enabled: boolean) => {
    setAutoSync(enabled);
    localStorage.setItem("cloud_photos_auto_sync", String(enabled));
    if (enabled) {
      showToast("Đã bật tự động sao lưu ảnh! 🔄");
      executeAutoSync(true);
    } else {
      showToast("Đã tắt tự động sao lưu");
    }
  };

  // Theme State (Dark / Light / System)
  const [theme, setTheme] = useState<ThemeMode>(() => {
    return (localStorage.getItem("cloud_photos_theme") as ThemeMode) || "dark";
  });
  const [systemIsDark, setSystemIsDark] = useState<boolean>(() => {
    return typeof window !== "undefined" && window.matchMedia
      ? window.matchMedia("(prefers-color-scheme: dark)").matches
      : true;
  });

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e: MediaQueryListEvent) => setSystemIsDark(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);

  const isDarkMode = theme === "system" ? systemIsDark : theme === "dark";

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.body.classList.remove("theme-dark", "theme-light");
      document.body.classList.add(isDarkMode ? "theme-dark" : "theme-light");
    }
  }, [isDarkMode]);

  const handleThemeChange = (newTheme: ThemeMode) => {
    setTheme(newTheme);
    localStorage.setItem("cloud_photos_theme", newTheme);
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3200);
  };

  // Upload & Camera State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const albumFileInputRef = useRef<HTMLInputElement>(null);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);
  const [isUploadMenuOpen, setIsUploadMenuOpen] = useState(false);

  // Pull-to-Refresh State
  const [pullDistance, setPullDistance] = useState(0);
  const [isPulling, setIsPulling] = useState(false);
  const touchStartY = useRef<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (window.scrollY <= 5 && !loading && !isSelectMode) {
      touchStartY.current = e.touches[0].clientY;
      setIsPulling(true);
    } else {
      touchStartY.current = null;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartY.current === null || loading || isSelectMode) return;
    const currentY = e.touches[0].clientY;
    const diff = currentY - touchStartY.current;
    if (diff > 0 && window.scrollY <= 5) {
      const damped = Math.min(Math.pow(diff, 0.85) * 1.8, 85);
      setPullDistance(damped);
    } else {
      setPullDistance(0);
    }
  };

  const handleTouchEnd = async () => {
    if (touchStartY.current === null) return;
    setIsPulling(false);
    touchStartY.current = null;
    if (pullDistance >= 55 && !loading && !isSelectMode) {
      setPullDistance(55);
      await loadPhotos();
    }
    setPullDistance(0);
  };

  const handleTriggerUpload = () => {
    if (!config.isLoggedIn && !config.sessionString) {
      setIsSettingsOpen(true);
      return;
    }
    setIsUploadMenuOpen(true);
  };

  const handleFilesSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setIsUploadMenuOpen(false);
    if (files.length === 0) return;

    try {
      const uploaded = await uploadPhotosToTelegram(config, files, (p) => {
        setUploadProgress(p);
      });
      if (uploaded.length > 0) {
        setPhotos((prev) => [...uploaded, ...prev]);
        showToast(`Đã sao lưu ${uploaded.length} ảnh lên Telegram thành công! 🎉`);
      }
    } catch (err: any) {
      console.error("Upload error:", err);
      setErrorMessage("Lỗi khi tải ảnh lên Telegram: " + (err.message || ""));
      showToast("Lỗi tải ảnh: " + (err.message || "Thử lại sau"));
    } finally {
      setTimeout(() => setUploadProgress(null), 1200);
      if (fileInputRef.current) fileInputRef.current.value = "";
      if (cameraInputRef.current) cameraInputRef.current.value = "";
    }
  };

  // Upload ảnh trực tiếp vào một Custom Album
  const handleFilesSelectedForAlbum = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0 || !selectedUserAlbum) return;

    try {
      const uploaded = await uploadPhotosToTelegram(config, files, (p) => {
        setUploadProgress(p);
      });
      if (uploaded.length > 0) {
        setPhotos((prev) => [...uploaded, ...prev]);
        const newIds = uploaded.map((u) => u.messageId);
        const updatedAlbums = addPhotosToAlbum(
          selectedUserAlbum.id,
          newIds,
          uploaded[0].thumbnailUrl || uploaded[0].url
        );
        setUserAlbums(updatedAlbums);
        const refreshed = updatedAlbums.find((a) => a.id === selectedUserAlbum.id);
        if (refreshed) setSelectedUserAlbum(refreshed);
        showToast(`Đã thêm ${uploaded.length} ảnh mới vào album "${selectedUserAlbum.title}"!`);
      }
    } catch (err: any) {
      showToast("Lỗi tải ảnh: " + (err.message || ""));
    } finally {
      setTimeout(() => setUploadProgress(null), 1200);
      if (albumFileInputRef.current) albumFileInputRef.current.value = "";
    }
  };

  // Danh sách ảnh yêu thích lưu trong LocalStorage
  const [favorites, setFavorites] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem("insta_favorites");
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  });

  const toggleFavorite = (id: string) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      localStorage.setItem("insta_favorites", JSON.stringify(Array.from(next)));
      return next;
    });
  };

  // Giai đoạn 1: Đọc ảnh từ IndexedDB hiển thị tức thì (< 50ms)
  useEffect(() => {
    getCachedPhotosFromDB().then((cached) => {
      if (cached && cached.length > 0) {
        setPhotos(cached);
      }
    });
  }, []);

  const loadPhotos = async (isBackground = false) => {
    if (!isBackground && photos.length === 0) {
      setLoading(true);
    }
    setErrorMessage("");
    try {
      const data = await fetchChannelPhotos(config, 80);
      if (data && data.length > 0) {
        setPhotos(data);
      } else {
        // Đảm bảo không làm trống màn hình nếu trong cache IndexedDB có ảnh
        const cached = await getCachedPhotosFromDB();
        if (cached && cached.length > 0) {
          setPhotos(cached);
        }
      }
    } catch (e: any) {
      console.error(e);
      const cached = await getCachedPhotosFromDB();
      if (cached && cached.length > 0) {
        setPhotos(cached);
      } else if (e.message && e.message.includes("CHUA_DANG_NHAP")) {
        setErrorMessage("Chưa đăng nhập Telegram cá nhân. Vui lòng bấm Cài đặt và nhập SĐT.");
      } else {
        if (photos.length === 0) {
          setErrorMessage(e.message || "Lỗi tải ảnh từ Telegram");
        }
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (config.isLoggedIn || config.sessionString) {
      loadPhotos(true);
    }
  }, [config.apiId, config.apiHash, config.sessionString, config.isLoggedIn]);

  // Tự động sao lưu ảnh Camera Roll lên Telegram khi mở app hoặc bật Auto-Sync
  useEffect(() => {
    if (autoSync && (config.isLoggedIn || config.sessionString)) {
      loadPhotos(true);
      executeAutoSync(false);
    }
  }, [autoSync, config.sessionString, config.isLoggedIn]);

  // Lắng nghe khi app mở lại từ nền (App Resume) để tự động quét sao lưu ảnh mới chụp (có debounce 2.5s)
  useEffect(() => {
    let listenerHandle: any = null;
    let resumeTimeout: any = null;
    CapApp.addListener("appStateChange", ({ isActive }) => {
      if (isActive && autoSync && (config.isLoggedIn || config.sessionString)) {
        if (resumeTimeout) clearTimeout(resumeTimeout);
        resumeTimeout = setTimeout(() => {
          loadPhotos(true);
          executeAutoSync(false);
        }, 2500);
      }
    }).then((h) => {
      listenerHandle = h;
    });

    return () => {
      if (listenerHandle && listenerHandle.remove) {
        listenerHandle.remove();
      }
      if (resumeTimeout) clearTimeout(resumeTimeout);
    };
  }, [autoSync, config.sessionString, config.isLoggedIn]);

  // Phân loại các bài viết cũ thành từng Album
  const postAlbums: PostAlbum[] = useMemo(() => {
    const map = new Map<string, PhotoItem[]>();

    photos.forEach((p) => {
      const key =
        p.originalUrl ||
        (p.groupedId ? `group-${p.groupedId}` : `single-${p.messageId}`);
      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key)!.push(p);
    });

    const albums: PostAlbum[] = [];
    map.forEach((items, key) => {
      const first = items[0];
      let title = "";
      if (first.author) {
        title = `@${first.author}`;
      } else if (first.caption) {
        title = first.caption.slice(0, 35) + "...";
      } else {
        title = `Khoảnh khắc ${first.date.toLocaleDateString("vi-VN")}`;
      }

      albums.push({
        id: key,
        title,
        originalUrl: first.originalUrl,
        author: first.author || "Telegram",
        date: first.date,
        coverPhoto: first,
        photos: items,
      });
    });

    return albums.sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [photos]);

  // Danh sách tác giả nổi bật cho tab Kỷ niệm
  const featuredCreators = useMemo(() => {
    const map = new Map<string, { count: number; cover: string }>();
    photos.forEach((p) => {
      if (!p.author) return;
      const prev = map.get(p.author) || { count: 0, cover: p.url };
      map.set(p.author, { count: prev.count + 1, cover: prev.cover });
    });
    return Array.from(map.entries())
      .map(([author, info]) => ({ author, ...info }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [photos]);

  // Lọc và Sắp xếp ảnh
  const filteredPhotos = useMemo(() => {
    let list = [...photos];

    // Chỉ lọc theo từ khóa khi người dùng đang ở tab Tìm kiếm
    if (currentTab === "search" && searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (p) =>
          p.author?.toLowerCase().includes(q) ||
          p.caption?.toLowerCase().includes(q)
      );
    }

    if (activeFilter === "Yêu thích") {
      list = list.filter(
        (p) =>
          favorites.has(String(p.id)) || favorites.has(String(p.messageId))
      );
    } else if (activeFilter === "Album") {
      list = list.filter((p) => p.isCarousel);
    }

    // Áp dụng sắp xếp
    if (sortBy === "added") {
      // Đã thêm gần đây: theo messageId giảm dần
      list.sort((a, b) => b.messageId - a.messageId);
    } else {
      // Ngày chụp: theo ngày tháng giảm dần
      list.sort((a, b) => b.date.getTime() - a.date.getTime());
    }

    return list;
  }, [photos, activeFilter, searchQuery, favorites, sortBy, currentTab]);

  // Tính dải ngày tháng hiển thị dưới tiêu đề "Thư viện" (Ví dụ: "19 thg 8 – 10 thg 9, 2026")
  const dateRangeText = useMemo(() => {
    if (filteredPhotos.length === 0) {
      return "Kho ảnh Telegram";
    }
    const dates = filteredPhotos.map((p) => p.date.getTime()).sort((a, b) => a - b);
    const earliest = new Date(dates[0]);
    const latest = new Date(dates[dates.length - 1]);

    const formatShort = (d: Date) =>
      `${d.getDate()} thg ${d.getMonth() + 1}`;

    if (earliest.getFullYear() === latest.getFullYear()) {
      if (earliest.getMonth() === latest.getMonth() && earliest.getDate() === latest.getDate()) {
        return `${formatShort(earliest)}, ${earliest.getFullYear()}`;
      }
      return `${formatShort(earliest)} – ${formatShort(latest)}, ${latest.getFullYear()}`;
    }
    return `${formatShort(earliest)}, ${earliest.getFullYear()} – ${formatShort(latest)}, ${latest.getFullYear()}`;
  }, [filteredPhotos]);

  // Gom nhóm ảnh theo ngày (Apple Photos format)
  const groupedPhotos: DateGroup[] = useMemo(() => {
    const map = new Map<string, PhotoItem[]>();
    const today = new Date().toDateString();
    const yesterday = new Date(Date.now() - 86400000).toDateString();

    filteredPhotos.forEach((photo) => {
      const dStr = photo.date.toDateString();
      let title = "";
      if (dStr === today) {
        title = "Hôm nay";
      } else if (dStr === yesterday) {
        title = "Hôm qua";
      } else {
        title = photo.date.toLocaleDateString("vi-VN", {
          day: "numeric",
          month: "long",
          year: "numeric",
        });
      }

      if (!map.has(title)) {
        map.set(title, []);
      }
      map.get(title)!.push(photo);
    });

    return Array.from(map.entries()).map(([dateTitle, pList]) => ({
      dateTitle,
      photos: pList,
    }));
  }, [filteredPhotos]);

  // Toggle chọn 1 ảnh trong Select Mode
  const handleToggleSelectPhoto = (photo: PhotoItem) => {
    setSelectedPhotoIds((prev) => {
      const next = new Set(prev);
      if (next.has(photo.messageId) || next.has(photo.id)) {
        next.delete(photo.messageId);
        next.delete(photo.id);
      } else {
        next.add(photo.messageId);
      }
      return next;
    });
  };

  // Chọn tất cả / Bỏ chọn tất cả
  const handleToggleSelectAll = () => {
    if (selectedPhotoIds.size === filteredPhotos.length) {
      setSelectedPhotoIds(new Set());
    } else {
      setSelectedPhotoIds(new Set(filteredPhotos.map((p) => p.messageId)));
    }
  };

  // Yêu thích nhiều ảnh cùng lúc
  const handleFavoriteBatch = () => {
    const idStrings = Array.from(selectedPhotoIds).map(String);
    setFavorites((prev) => {
      const next = new Set(prev);
      idStrings.forEach((id) => next.add(id));
      localStorage.setItem("insta_favorites", JSON.stringify(Array.from(next)));
      return next;
    });
    showToast(`Đã thêm ${idStrings.length} ảnh vào Mục yêu thích ❤️`);
  };

  // Chuyển đổi Tab điều hướng và reset bộ lọc an toàn khi về Thư viện
  const handleTabChange = (tabId: string) => {
    if (tabId === "library") {
      // Khi bấm vào Thư viện: luôn reset bộ lọc và từ khóa tìm kiếm để không bị ẩn ảnh
      setActiveFilter("Tất cả");
      setSearchQuery("");
      // Nếu kho ảnh đang rỗng, đọc lại từ IndexedDB để hiển thị tức thì
      if (photos.length === 0) {
        getCachedPhotosFromDB().then((cached) => {
          if (cached && cached.length > 0) {
            setPhotos(cached);
          } else {
            loadPhotos(true);
          }
        });
      }
    }
    setCurrentTab(tabId);
  };

  // Xóa hàng loạt nhiều ảnh cùng lúc
  const handleExecuteDeleteBatch = async () => {
    const idsToDelete = Array.from(selectedPhotoIds).map(Number);
    if (idsToDelete.length === 0) return;

    setIsDeletingBatch(true);
    try {
      // 1. Xóa khỏi IndexedDB
      await removeMultiplePhotosFromCache(idsToDelete);

      // 2. Cập nhật state UI ngay lập tức
      const deleteSet = new Set(idsToDelete);
      setPhotos((prev) => prev.filter((p) => !deleteSet.has(p.messageId)));

      // 3. Xóa trên Kênh Telegram
      await deleteMultipleTelegramPhotos(config, idsToDelete);

      showToast(`Đã xóa ${idsToDelete.length} ảnh thành công 🗑️`);
      setIsSelectMode(false);
      setSelectedPhotoIds(new Set());
      setIsConfirmDeleteBatchOpen(false);
    } catch (err: any) {
      showToast("Lỗi khi xóa ảnh: " + (err.message || "Thử lại sau"));
    } finally {
      setIsDeletingBatch(false);
    }
  };

  const handleSaveConfig = (newCfg: TelegramConfig) => {
    setConfig(newCfg);
    saveStoredConfig(newCfg);
  };

  // Xử lý tạo Album mới
  const handleCreateAlbumSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!albumNameInput.trim()) return;
    const created = createNewAlbum(albumNameInput.trim());
    const updated = getUserAlbums();
    setUserAlbums(updated);
    setAlbumNameInput("");
    setIsCreateAlbumModalOpen(false);
    setSelectedUserAlbum(created);
    showToast(`Đã tạo album "${created.title}" thành công!`);
  };

  // Thêm ảnh đã có vào User Album
  const handleConfirmAddPhotosToAlbum = () => {
    if (!selectedUserAlbum) return;
    const selectedIds = Array.from(selectedPhotoIdsForAlbum);
    if (selectedIds.length === 0) {
      setIsAddPhotosModalOpen(false);
      return;
    }
    const targetPhotos = photos.filter((p) => selectedIds.includes(p.messageId) || selectedIds.includes(p.id));
    const coverUrl = targetPhotos[0]?.thumbnailUrl || targetPhotos[0]?.url;

    const updated = addPhotosToAlbum(selectedUserAlbum.id, selectedIds, coverUrl);
    setUserAlbums(updated);
    const refreshed = updated.find((a) => a.id === selectedUserAlbum.id);
    if (refreshed) setSelectedUserAlbum(refreshed);
    setIsAddPhotosModalOpen(false);
    setSelectedPhotoIdsForAlbum(new Set());
    showToast(`Đã thêm ${selectedIds.length} ảnh vào album!`);
  };

  // Xóa User Album
  const handleDeleteCurrentAlbum = () => {
    if (!selectedUserAlbum) return;
    if (window.confirm(`Bạn có chắc muốn xóa album "${selectedUserAlbum.title}"? (Ảnh gốc trên Telegram không bị xóa)`)) {
      const updated = deleteAlbum(selectedUserAlbum.id);
      setUserAlbums(updated);
      setSelectedUserAlbum(null);
      showToast("Đã xóa album.");
    }
  };

  // Danh sách ảnh của Custom Album đang xem
  const currentAlbumPhotos = useMemo(() => {
    if (!selectedUserAlbum) return [];
    return getPhotosInAlbum(selectedUserAlbum, photos);
  }, [selectedUserAlbum, photos]);

  return (
    <div
      className={`min-h-screen font-sans selection:bg-blue-600 transition-colors duration-200 ${
        isDarkMode ? "bg-black text-white" : "bg-[#f2f2f7] text-neutral-900"
      }`}
    >
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 inset-x-0 mx-auto w-fit max-w-[90vw] z-50 px-5 py-2.5 bg-neutral-900/95 border border-neutral-700/80 backdrop-blur-xl text-white text-sm font-bold rounded-full shadow-2xl animate-in fade-in duration-200 flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="truncate">{toastMessage}</span>
        </div>
      )}

      {/* Top Header Mới: Chuẩn Apple Photos iOS 18 (Xóa hẳn thanh segmented control, thay bằng Menu 3 gạch & Nút Chọn to) */}
      <Header
        dateRangeText={dateRangeText}
        isSelectMode={isSelectMode}
        onToggleSelectMode={() => {
          setIsSelectMode(!isSelectMode);
          if (isSelectMode) setSelectedPhotoIds(new Set());
        }}
        sortBy={sortBy}
        onSortChange={setSortBy}
        activeFilter={activeFilter}
        onFilterChange={setActiveFilter}
        onOpenSettings={() => setIsSettingsOpen(true)}
        isDarkMode={isDarkMode}
      />

      {/* Main Content Area with Pull-To-Refresh */}
      <main
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className="max-w-md mx-auto min-h-[calc(100vh-140px)]"
      >
        {/* Pull-To-Refresh Indicator */}
        <div
          style={{
            height: `${pullDistance}px`,
            transition: isPulling ? "none" : "height 0.25s cubic-bezier(0.2, 0, 0, 1)",
          }}
          className="overflow-hidden flex items-center justify-center pointer-events-none"
        >
          <div
            className={`flex items-center gap-2 py-2 text-sm font-bold ${
              isDarkMode ? "text-neutral-300" : "text-neutral-600"
            }`}
          >
            <RefreshCw
              style={{
                transform: `rotate(${pullDistance * 4}deg)`,
              }}
              className={`w-5 h-5 text-blue-500 ${
                pullDistance >= 55 || loading ? "animate-spin" : ""
              }`}
            />
            <span>
              {pullDistance >= 55 || loading
                ? "Đang làm mới ảnh từ Telegram..."
                : "Kéo xuống để làm mới"}
            </span>
          </div>
        </div>

        {/* Banner Tiến Trình Upload Lên Đám Mây */}
        {uploadProgress && (
          <div
            className={`mx-4 mt-3 mb-2 p-4 rounded-2xl flex items-center gap-3.5 shadow-2xl backdrop-blur-md animate-in slide-in-from-top duration-200 border ${
              isDarkMode
                ? "bg-neutral-900/95 border-blue-500/40 text-white"
                : "bg-white/95 border-blue-400/50 text-neutral-900 shadow-lg"
            }`}
          >
            <div className="w-10 h-10 rounded-full bg-blue-500/20 text-blue-500 flex items-center justify-center shrink-0">
              <UploadCloud className="w-6 h-6 animate-pulse" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="font-bold truncate">
                  Đang sao lưu {uploadProgress.current}/{uploadProgress.total}: {uploadProgress.currentFileName}
                </span>
                <span className="font-extrabold text-blue-500">{uploadProgress.percent}%</span>
              </div>
              <div
                className={`w-full h-2 rounded-full overflow-hidden ${
                  isDarkMode ? "bg-neutral-800" : "bg-neutral-200"
                }`}
              >
                <div
                  className="h-full bg-blue-500 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress.percent}%` }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Banner Chưa đăng nhập Telegram */}
        {!config.isLoggedIn && (
          <div
            onClick={() => setIsSettingsOpen(true)}
            className="mx-4 mt-3 mb-2 p-4 bg-gradient-to-r from-blue-900/60 to-indigo-900/60 border border-blue-500/40 rounded-2xl flex items-center justify-between cursor-pointer active:scale-98 transition-transform shadow-lg"
          >
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <div className="text-sm font-bold text-white">Chưa kết nối Kênh Telegram</div>
                <div className="text-xs text-blue-200 mt-0.5">
                  Bấm vào đây để đăng nhập & kết nối kênh sao lưu ảnh
                </div>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-blue-300 shrink-0" />
          </div>
        )}

        {/* Dynamic Island Capsule hiển thị tiến trình Live Activity chuẩn Apple */}
        {isAutoSyncing && (
          <div className="fixed top-2.5 left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-sm pointer-events-auto animate-in fade-in slide-in-from-top-4 duration-300">
            <div className="bg-black/95 backdrop-blur-2xl border border-white/20 text-white shadow-2xl rounded-full px-4 py-2.5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-7 h-7 rounded-full bg-cyan-500/20 flex items-center justify-center shrink-0">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-cyan-400" />
                </div>
                <div className="min-w-0">
                  <div className="text-[11px] font-bold text-white flex items-center gap-1.5 leading-none">
                    <span>CloudPhotos Sao lưu ngầm</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  </div>
                  <div className="text-[10px] text-neutral-300 truncate mt-1 leading-none font-medium">
                    {autoSyncStatusText || "Đang đồng bộ ảnh mới lên Telegram..."}
                  </div>
                </div>
              </div>
              <div className="shrink-0 px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-[10px] font-extrabold text-cyan-300 border border-cyan-400/40">
                LIVE
              </div>
            </div>
          </div>
        )}

        {/* Thông báo lỗi nếu có */}
        {errorMessage && (
          <div
            className={`mx-4 my-2 p-3.5 rounded-xl text-sm flex items-center justify-between border ${
              isDarkMode
                ? "bg-red-950/70 border-red-800/60 text-red-300"
                : "bg-red-50 border-red-200 text-red-700"
            }`}
          >
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
              <span>{errorMessage}</span>
            </div>
            <button
              onClick={() => loadPhotos(false)}
              className="ml-2 px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold text-xs active:scale-95 shrink-0"
            >
              Thử lại
            </button>
          </div>
        )}

        {/* TAB 1: THƯ VIỆN (LIBRARY) */}
        {currentTab === "library" && (
          <>
            {/* Banner tiến trình tự động sao lưu ảnh nền */}
            {isAutoSyncing && (
              <div className="mx-5 mb-3 px-4 py-2.5 rounded-2xl flex items-center gap-2.5 text-xs font-bold bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 animate-pulse">
                <RefreshCw className="w-4 h-4 animate-spin shrink-0 text-emerald-500" />
                <span className="truncate">{autoSyncStatusText || "Đang tự động sao lưu ảnh mới từ iPhone lên Telegram..."}</span>
              </div>
            )}

            {/* Chip hiển thị bộ lọc đang kích hoạt kèm nút xóa lọc nhanh */}
            {activeFilter !== "Tất cả" && (
              <div className="mx-5 mb-3 px-4 py-2.5 rounded-2xl flex items-center justify-between text-xs sm:text-sm font-semibold bg-blue-500/15 border border-blue-500/30 text-blue-400 shadow-sm">
                <span>
                  Đang lọc: <strong>{activeFilter === "Album" ? "Bộ sưu tập (Carousels)" : activeFilter}</strong>
                </span>
                <button
                  type="button"
                  onClick={() => setActiveFilter("Tất cả")}
                  className="font-bold underline text-xs text-blue-300 hover:text-white active:scale-95 transition-transform"
                >
                  Xem tất cả ảnh Thư viện ✕
                </button>
              </div>
            )}

            {loading && (
              <div
                className={`flex items-center justify-center py-10 gap-2 text-base font-semibold ${
                  isDarkMode ? "text-neutral-400" : "text-neutral-500"
                }`}
              >
                <RefreshCw className="w-5 h-5 animate-spin text-blue-500" />
                <span>Đang tải ảnh từ Telegram...</span>
              </div>
            )}

            <PhotoGrid
              groups={groupedPhotos}
              onSelectPhoto={(p) => setSelectedPhoto(p)}
              isDarkMode={isDarkMode}
              isSelectMode={isSelectMode}
              selectedPhotoIds={selectedPhotoIds}
              onToggleSelectPhoto={handleToggleSelectPhoto}
              activeFilter={activeFilter}
              onResetFilter={() => setActiveFilter("Tất cả")}
            />
          </>
        )}

        {/* TAB 2: TÌM KIẾM (SEARCH) */}
        {currentTab === "search" && (
          <div className="p-4 animate-in fade-in duration-200">
            <div className="relative mb-4">
              <Search
                className={`w-5 h-5 absolute left-3.5 top-3.5 ${
                  isDarkMode ? "text-neutral-400" : "text-neutral-500"
                }`}
              />
              <input
                type="text"
                placeholder="Tìm theo tác giả hoặc ghi chú caption..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full rounded-2xl pl-11 pr-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${
                  isDarkMode
                    ? "bg-neutral-900 border border-neutral-800 text-white placeholder-neutral-500"
                    : "bg-white border border-neutral-300 text-black placeholder-neutral-400 shadow-sm"
                }`}
              />
            </div>
            <PhotoGrid
              groups={groupedPhotos}
              onSelectPhoto={(p) => setSelectedPhoto(p)}
              isDarkMode={isDarkMode}
              isSelectMode={isSelectMode}
              selectedPhotoIds={selectedPhotoIds}
              onToggleSelectPhoto={handleToggleSelectPhoto}
            />
          </div>
        )}

        {/* TAB 3: ALBUMS (BỘ SƯU TẬP ALBUM CHUẨN IPHONE MẶC ĐỊNH) */}
        {currentTab === "albums" && (
          <div className="p-4 animate-in fade-in duration-200 pb-36">
            {/* 1. KHI ĐANG MỞ XEM 1 CUSTOM USER ALBUM */}
            {selectedUserAlbum ? (
              <div>
                <div
                  className={`flex items-center justify-between mb-4 pb-3 border-b ${
                    isDarkMode ? "border-neutral-800" : "border-neutral-200"
                  }`}
                >
                  <button
                    onClick={() => setSelectedUserAlbum(null)}
                    className="flex items-center text-blue-500 text-base font-bold active:opacity-70 -ml-1 py-1 pr-2"
                  >
                    <ChevronLeft className="w-6 h-6 mr-0.5" />
                    <span>Tất cả Album</span>
                  </button>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleDeleteCurrentAlbum}
                      className="p-2 text-red-500 hover:text-red-600 active:scale-95 transition-transform rounded-full bg-red-500/10"
                      title="Xóa Album"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <span
                      className={`text-sm font-semibold ${
                        isDarkMode ? "text-neutral-400" : "text-neutral-500"
                      }`}
                    >
                      {currentAlbumPhotos.length} ảnh
                    </span>
                  </div>
                </div>

                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-extrabold flex items-center gap-2">
                      {selectedUserAlbum.title}
                    </h2>
                    <p
                      className={`text-xs sm:text-sm mt-1 flex items-center gap-1.5 ${
                        isDarkMode ? "text-neutral-400" : "text-neutral-500"
                      }`}
                    >
                      <Calendar className="w-4 h-4 text-blue-500" />
                      <span>
                        Tạo ngày:{" "}
                        {new Date(selectedUserAlbum.createdAt).toLocaleDateString("vi-VN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                    </p>
                  </div>

                  {/* Nút Thêm ảnh vào Album */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setSelectedPhotoIdsForAlbum(new Set(selectedUserAlbum.photoIds));
                        setIsAddPhotosModalOpen(true);
                      }}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold flex items-center gap-1 active:scale-95 shadow-md"
                    >
                      <Plus className="w-4 h-4 stroke-[2.6]" />
                      Thêm ảnh
                    </button>
                    <button
                      onClick={() => albumFileInputRef.current?.click()}
                      className={`p-2.5 rounded-xl text-xs font-semibold flex items-center gap-1 active:scale-95 border ${
                        isDarkMode ? "bg-neutral-800 border-neutral-700 text-neutral-300" : "bg-white border-neutral-300 text-neutral-700 shadow-sm"
                      }`}
                      title="Tải ảnh mới từ máy vào Album này"
                    >
                      <ImagePlus className="w-5 h-5 text-blue-500" />
                    </button>
                  </div>
                </div>

                {/* Input chọn ảnh riêng cho album */}
                <input
                  ref={albumFileInputRef}
                  type="file"
                  multiple
                  accept="image/*,video/*"
                  className="hidden"
                  onChange={handleFilesSelectedForAlbum}
                />

                {currentAlbumPhotos.length === 0 ? (
                  <div className="p-8 text-center my-8">
                    <div
                      className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-3 ${
                        isDarkMode ? "bg-neutral-800 text-neutral-400" : "bg-neutral-200 text-neutral-600"
                      }`}
                    >
                      <ImageIcon className="w-8 h-8" />
                    </div>
                    <h4 className="font-bold text-base mb-1">Album chưa có ảnh</h4>
                    <p className="text-sm text-neutral-400 max-w-xs mx-auto mb-4">
                      Chạm vào "Thêm ảnh" để chọn từ kho ảnh đã lưu hoặc tải ảnh mới từ máy vào đây!
                    </p>
                    <button
                      onClick={() => {
                        setSelectedPhotoIdsForAlbum(new Set(selectedUserAlbum.photoIds));
                        setIsAddPhotosModalOpen(true);
                      }}
                      className="px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold inline-flex items-center gap-2 active:scale-95 shadow-md"
                    >
                      <Plus className="w-4 h-4 stroke-[3]" />
                      Chọn ảnh vào Album
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-1">
                    {currentAlbumPhotos.map((photo) => (
                      <div
                        key={photo.id}
                        onClick={() => setSelectedPhoto(photo)}
                        className={`aspect-square overflow-hidden cursor-pointer active:opacity-80 ${
                          isDarkMode ? "bg-neutral-900" : "bg-neutral-200"
                        }`}
                      >
                        <img
                          src={photo.thumbnailUrl || photo.url}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              /* 2. DANH SÁCH TẤT CẢ ALBUM (CHUẨN IPHONE PHOTOS) */
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-extrabold flex items-center gap-2">
                    <Folder className="w-6 h-6 text-blue-500" />
                    Album của tôi
                  </h2>
                  <button
                    onClick={() => setIsCreateAlbumModalOpen(true)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold flex items-center gap-1.5 active:scale-95 shadow-md"
                  >
                    <FolderPlus className="w-4 h-4 stroke-[2.6]" />
                    + Tạo Album
                  </button>
                </div>

                {/* Danh sách User Custom Albums */}
                {userAlbums.length > 0 && (
                  <div className="grid grid-cols-2 gap-3.5 mb-6">
                    {userAlbums.map((album) => {
                      const cover = getAlbumCoverUrl(album, photos);

                      return (
                        <div
                          key={album.id}
                          onClick={() => setSelectedUserAlbum(album)}
                          className={`border rounded-2xl overflow-hidden cursor-pointer active:scale-98 transition-all group ${
                            isDarkMode
                              ? "bg-neutral-900 border-neutral-800"
                              : "bg-white border-neutral-200 shadow-sm"
                          }`}
                        >
                          <div className="aspect-square relative overflow-hidden bg-gradient-to-tr from-blue-900/40 to-indigo-900/40 flex items-center justify-center">
                            {cover ? (
                              <img
                                src={cover}
                                alt=""
                                onError={(e) => {
                                  // Nếu URL ảnh lỗi, ẩn thẻ img để hiển thị icon thư mục dự phòng
                                  (e.target as HTMLElement).style.display = "none";
                                }}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              />
                            ) : (
                              <Folder className="w-14 h-14 text-blue-500/60" />
                            )}
                            <div className="absolute top-2.5 right-2.5 bg-black/70 backdrop-blur-md px-2.5 py-0.5 rounded-full flex items-center gap-1 text-xs font-bold text-white">
                              <span>{album.photoIds.length} ảnh</span>
                            </div>
                          </div>
                          <div className="p-3.5">
                            <h4 className="font-bold text-base truncate">
                              {album.title}
                            </h4>
                            <p
                              className={`text-xs mt-0.5 ${
                                isDarkMode ? "text-neutral-400" : "text-neutral-500"
                              }`}
                            >
                              {album.photoIds.length} bức ảnh
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {userAlbums.length === 0 && (
                  <div
                    onClick={() => setIsCreateAlbumModalOpen(true)}
                    className={`p-7 rounded-2xl border border-dashed mb-6 text-center cursor-pointer active:scale-98 transition-transform ${
                      isDarkMode ? "border-neutral-800 bg-neutral-900/40" : "border-neutral-300 bg-white shadow-sm"
                    }`}
                  >
                    <FolderPlus className="w-10 h-10 text-blue-500 mx-auto mb-2" />
                    <h4 className="text-base font-bold">Chưa có album tùy chỉnh nào</h4>
                    <p className="text-xs sm:text-sm text-neutral-400 mt-1">
                      Chạm vào đây để tạo Album đầu tiên của bạn
                    </p>
                  </div>
                )}

                {/* Danh mục Album mặc định */}
                <h3
                  className={`text-base font-bold mb-3 ${
                    isDarkMode ? "text-neutral-200" : "text-neutral-800"
                  }`}
                >
                  Mục Album tiện ích
                </h3>
                <div className="grid grid-cols-2 gap-3.5 mb-6">
                  {/* Mục Yêu Thích */}
                  <div
                    onClick={() => {
                      setActiveFilter("Yêu thích");
                      setCurrentTab("library");
                    }}
                    className={`border rounded-2xl p-4 cursor-pointer active:scale-98 transition-all ${
                      isDarkMode
                        ? "bg-neutral-900 border-neutral-800"
                        : "bg-white border-neutral-200 shadow-sm"
                    }`}
                  >
                    <div className="w-11 h-11 rounded-xl bg-red-500/20 text-red-500 flex items-center justify-center mb-3">
                      <Heart className="w-6 h-6 fill-red-500" />
                    </div>
                    <h3 className="font-bold text-base">Yêu thích</h3>
                    <p
                      className={`text-xs mt-0.5 ${
                        isDarkMode ? "text-neutral-400" : "text-neutral-500"
                      }`}
                    >
                      {favorites.size} ảnh đã thích
                    </p>
                  </div>

                  {/* Bài viết nhiều ảnh (Carousels) */}
                  <div
                    onClick={() => {
                      setActiveFilter("Album");
                      setCurrentTab("library");
                    }}
                    className={`border rounded-2xl p-4 cursor-pointer active:scale-98 transition-all ${
                      isDarkMode
                        ? "bg-neutral-900 border-neutral-800"
                        : "bg-white border-neutral-200 shadow-sm"
                    }`}
                  >
                    <div className="w-11 h-11 rounded-xl bg-purple-500/20 text-purple-500 flex items-center justify-center mb-3">
                      <Layers className="w-6 h-6" />
                    </div>
                    <h3 className="font-bold text-base">Carousels</h3>
                    <p
                      className={`text-xs mt-0.5 ${
                        isDarkMode ? "text-neutral-400" : "text-neutral-500"
                      }`}
                    >
                      {postAlbums.filter((a) => a.photos.length > 1).length} bài viết
                    </p>
                  </div>
                </div>

                {/* Danh mục Album bài viết */}
                {postAlbums.length > 0 && (
                  <>
                    <h3
                      className={`text-base font-bold mb-3 ${
                        isDarkMode ? "text-neutral-200" : "text-neutral-800"
                      }`}
                    >
                      Album theo bài viết ({postAlbums.length})
                    </h3>

                    <div className="grid grid-cols-2 gap-3.5">
                      {postAlbums.map((album) => (
                        <div
                          key={album.id}
                          onClick={() => setSelectedAlbum(album)}
                          className={`border rounded-2xl overflow-hidden cursor-pointer active:scale-98 transition-all group ${
                            isDarkMode
                              ? "bg-neutral-900 border-neutral-800"
                              : "bg-white border-neutral-200 shadow-sm"
                          }`}
                        >
                          <div className="aspect-square relative overflow-hidden bg-neutral-800">
                            <img
                              src={album.coverPhoto.thumbnailUrl || album.coverPhoto.url}
                              alt=""
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                            <div className="absolute top-2.5 right-2.5 bg-black/70 backdrop-blur-md px-2.5 py-0.5 rounded-full flex items-center gap-1 text-xs font-bold text-white">
                              <Layers className="w-3.5 h-3.5 text-blue-400" />
                              <span>{album.photos.length}</span>
                            </div>
                          </div>
                          <div className="p-3.5">
                            <h4 className="font-bold text-sm truncate">
                              {album.title}
                            </h4>
                            <p
                              className={`text-xs mt-0.5 ${
                                isDarkMode ? "text-neutral-400" : "text-neutral-500"
                              }`}
                            >
                              {album.date.toLocaleDateString("vi-VN", {
                                day: "numeric",
                                month: "short",
                              })}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: KỶ NIỆM (MEMORIES) */}
        {currentTab === "memories" && (
          <div className="p-4 space-y-6 animate-in fade-in duration-200 pb-36">
            <div>
              <h2 className="text-2xl font-extrabold flex items-center gap-2">
                <Sparkles className="w-6 h-6 text-purple-500" />
                Dành Cho Bạn
              </h2>
              <p
                className={`text-sm mt-0.5 ${
                  isDarkMode ? "text-neutral-400" : "text-neutral-500"
                }`}
              >
                Các khoảnh khắc và bộ sưu tập được gợi ý tự động
              </p>
            </div>

            {/* Hero Card: Kỷ niệm nổi bật */}
            {photos.length > 0 && (
              <div
                onClick={() => setSelectedPhoto(photos[0])}
                className="relative h-64 rounded-3xl overflow-hidden cursor-pointer shadow-2xl active:scale-98 transition-transform"
              >
                <img
                  src={photos[0].url}
                  alt=""
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent flex flex-col justify-end p-5">
                  <span className="px-3 py-1 bg-purple-600/90 backdrop-blur-md rounded-full text-xs font-extrabold uppercase tracking-wider text-white w-fit mb-2">
                    Khoảnh khắc nổi bật
                  </span>
                  <h3 className="text-xl font-bold text-white leading-snug">
                    {photos[0].caption ? photos[0].caption.slice(0, 50) + "..." : "Ảnh mới nhất từ kho Telegram"}
                  </h3>
                  <p className="text-xs sm:text-sm text-neutral-300 mt-1">
                    @{photos[0].author || "Telegram"} • {photos[0].date.toLocaleDateString("vi-VN")}
                  </p>
                </div>
              </div>
            )}

            {/* Mục: Tác giả nổi bật */}
            {featuredCreators.length > 0 && (
              <div>
                <h3
                  className={`text-base font-bold mb-3 flex items-center gap-1.5 ${
                    isDarkMode ? "text-neutral-200" : "text-neutral-800"
                  }`}
                >
                  <User className="w-5 h-5 text-blue-500" />
                  Tác giả lưu trữ nhiều nhất
                </h3>
                <div className="flex gap-3.5 overflow-x-auto pb-2 scrollbar-none">
                  {featuredCreators.map((creator) => (
                    <div
                      key={creator.author}
                      onClick={() => {
                        setSearchQuery(creator.author);
                        setCurrentTab("search");
                      }}
                      className="flex flex-col items-center shrink-0 w-22 cursor-pointer active:scale-95 transition-transform"
                    >
                      <div className="w-18 h-18 rounded-full overflow-hidden p-0.5 bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 mb-1.5 shadow-md">
                        <img
                          src={creator.cover}
                          alt=""
                          className="w-full h-full object-cover rounded-full bg-neutral-800"
                        />
                      </div>
                      <p className="text-xs sm:text-sm font-bold truncate w-full text-center">
                        @{creator.author}
                      </p>
                      <span
                        className={`text-xs ${
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
          </div>
        )}
      </main>

      {/* MODAL 1: TẠO ALBUM MỚI */}
      {isCreateAlbumModalOpen && (
        <div
          onClick={() => setIsCreateAlbumModalOpen(false)}
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className={`w-full max-w-sm rounded-3xl p-6 shadow-2xl border ${
              isDarkMode
                ? "bg-[#1c1c1e] text-white border-neutral-800"
                : "bg-white text-neutral-900 border-neutral-300"
            }`}
          >
            <h3 className="text-lg font-bold text-center mb-1">Album mới</h3>
            <p className="text-sm text-neutral-400 text-center mb-4">
              Nhập tên cho album này
            </p>

            <form onSubmit={handleCreateAlbumSubmit} className="space-y-4">
              <input
                type="text"
                autoFocus
                placeholder="Ví dụ: Du lịch, Gia đình, Bạn bè..."
                value={albumNameInput}
                onChange={(e) => setAlbumNameInput(e.target.value)}
                className={`w-full rounded-2xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  isDarkMode
                    ? "bg-neutral-800 border border-neutral-700 text-white"
                    : "bg-neutral-100 border border-neutral-300 text-black"
                }`}
              />

              <div className="flex gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsCreateAlbumModalOpen(false)}
                  className={`flex-1 py-3 rounded-xl text-sm font-bold ${
                    isDarkMode ? "bg-neutral-800 text-neutral-300" : "bg-neutral-200 text-neutral-700"
                  }`}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={!albumNameInput.trim()}
                  className="flex-1 py-3 bg-blue-600 disabled:opacity-50 text-white font-bold rounded-xl text-sm active:scale-98 transition-transform shadow-md"
                >
                  Lưu
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: CHỌN ẢNH ĐÃ CÓ TRONG KHO VÀO ALBUM */}
      {isAddPhotosModalOpen && selectedUserAlbum && (
        <div
          onClick={() => setIsAddPhotosModalOpen(false)}
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className={`w-full max-w-lg rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl border max-h-[85vh] flex flex-col ${
              isDarkMode
                ? "bg-[#1c1c1e] text-white border-neutral-800"
                : "bg-white text-neutral-900 border-neutral-300"
            }`}
          >
            <div className="flex items-center justify-between pb-3.5 border-b border-neutral-800 mb-3">
              <div>
                <h3 className="text-lg font-bold">Thêm ảnh vào Album</h3>
                <p className="text-xs sm:text-sm text-neutral-400">
                  Đã chọn {selectedPhotoIdsForAlbum.size} ảnh
                </p>
              </div>
              <button
                onClick={handleConfirmAddPhotosToAlbum}
                className="px-5 py-2 bg-blue-600 text-white font-bold rounded-xl text-sm active:scale-95 shadow-md"
              >
                Xong
              </button>
            </div>

            {/* Lưới chọn ảnh */}
            <div className="flex-1 overflow-y-auto grid grid-cols-3 gap-1 pr-0.5">
              {photos.map((photo) => {
                const isSelected =
                  selectedPhotoIdsForAlbum.has(photo.messageId) ||
                  selectedPhotoIdsForAlbum.has(photo.id);

                const handleToggle = () => {
                  setSelectedPhotoIdsForAlbum((prev) => {
                    const next = new Set(prev);
                    if (isSelected) {
                      next.delete(photo.messageId);
                      next.delete(photo.id);
                    } else {
                      next.add(photo.messageId);
                    }
                    return next;
                  });
                };

                return (
                  <div
                    key={photo.id}
                    onClick={handleToggle}
                    className="relative aspect-square overflow-hidden cursor-pointer active:opacity-80 group"
                  >
                    <img
                      src={photo.thumbnailUrl || photo.url}
                      alt=""
                      className={`w-full h-full object-cover transition-opacity ${
                        isSelected ? "opacity-75" : ""
                      }`}
                    />
                    <div
                      className={`absolute top-2 right-2 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                        isSelected
                          ? "bg-blue-600 border-white text-white shadow-md scale-105"
                          : "border-white/80 bg-black/40 text-transparent"
                      }`}
                    >
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Inputs Ẩn: Thư viện & Camera */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,video/*"
        className="hidden"
        onChange={handleFilesSelected}
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFilesSelected}
      />

      {/* iOS Action Sheet: Lựa chọn Tải ảnh / Chụp ảnh */}
      {isUploadMenuOpen && (
        <div
          onClick={() => setIsUploadMenuOpen(false)}
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end justify-center p-3 sm:p-4 animate-in fade-in duration-200"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm space-y-2.5 animate-in slide-in-from-bottom duration-250"
          >
            <div
              className={`rounded-2xl overflow-hidden divide-y backdrop-blur-2xl shadow-2xl ${
                isDarkMode
                  ? "bg-[#1c1c1e]/95 divide-neutral-800 text-white"
                  : "bg-white/95 divide-neutral-200 text-neutral-900"
              }`}
            >
              <div className="py-3 px-4 text-center">
                <p className="text-xs sm:text-sm font-bold text-neutral-400">
                  Thêm ảnh vào Kho lưu trữ Telegram
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setIsUploadMenuOpen(false);
                  fileInputRef.current?.click();
                }}
                className="w-full py-4 px-5 flex items-center justify-between active:opacity-70 transition-opacity"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-500 flex items-center justify-center">
                    <ImageIcon className="w-6 h-6" />
                  </div>
                  <span className="text-base font-bold">Chọn từ Thư viện ảnh</span>
                </div>
                <ChevronRight className="w-5 h-5 text-neutral-400" />
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsUploadMenuOpen(false);
                  cameraInputRef.current?.click();
                }}
                className="w-full py-4 px-5 flex items-center justify-between active:opacity-70 transition-opacity"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-500 flex items-center justify-center">
                    <Camera className="w-6 h-6" />
                  </div>
                  <span className="text-base font-bold">Chụp ảnh mới (Camera)</span>
                </div>
                <ChevronRight className="w-5 h-5 text-neutral-400" />
              </button>
            </div>

            <button
              type="button"
              onClick={() => setIsUploadMenuOpen(false)}
              className={`w-full py-4 rounded-2xl font-extrabold text-base backdrop-blur-2xl shadow-xl transition-all active:scale-98 ${
                isDarkMode
                  ? "bg-[#2c2c2e]/95 text-white"
                  : "bg-white/95 text-blue-600"
              }`}
            >
              Hủy
            </button>
          </div>
        </div>
      )}

      {/* THANH ĐIỀU KHIỂN KHI ĐANG Ở CHẾ ĐỘ CHỌN (SELECT MODE ACTION BAR) */}
      {isSelectMode ? (
        <div
          style={{
            paddingBottom: "max(calc(var(--sab) - 6px), 14px)",
            backdropFilter: "blur(28px)",
            WebkitBackdropFilter: "blur(28px)",
          }}
          className={`fixed inset-x-0 bottom-0 z-40 px-6 py-3.5 flex items-center justify-between border-t transition-all duration-200 animate-in slide-in-from-bottom ${
            isDarkMode
              ? "bg-[#18181c]/90 border-white/15 text-white"
              : "bg-white/90 border-black/10 text-neutral-900 shadow-2xl"
          }`}
        >
          {/* Nút Chọn tất cả / Bỏ chọn */}
          <button
            type="button"
            onClick={handleToggleSelectAll}
            className="text-sm font-bold text-blue-500 active:opacity-70"
          >
            {selectedPhotoIds.size === filteredPhotos.length ? "Bỏ chọn tất cả" : "Chọn tất cả"}
          </button>

          {/* Số lượng đã chọn */}
          <div className="text-center">
            <span className="text-sm font-extrabold">
              {selectedPhotoIds.size > 0 ? `Đã chọn ${selectedPhotoIds.size} ảnh` : "Chọn ảnh"}
            </span>
          </div>

          {/* Cụm nút thao tác (Yêu thích & Thùng rác Xóa) */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              disabled={selectedPhotoIds.size === 0}
              onClick={handleFavoriteBatch}
              className="p-2.5 rounded-full bg-red-500/15 text-red-500 disabled:opacity-40 active:scale-95 transition-transform"
              title="Yêu thích các ảnh đã chọn"
            >
              <Heart className="w-5 h-5 fill-red-500/40" />
            </button>

            <button
              type="button"
              disabled={selectedPhotoIds.size === 0}
              onClick={() => setIsConfirmDeleteBatchOpen(true)}
              className="p-2.5 rounded-full bg-red-600 text-white disabled:opacity-40 active:scale-95 transition-transform shadow-md"
              title="Xóa các ảnh đã chọn"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
        </div>
      ) : (
        /* iOS Bottom TabBar bình thường */
        <TabBar
          currentTab={currentTab}
          onTabChange={handleTabChange}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onOpenAddPhoto={handleTriggerUpload}
          isDarkMode={isDarkMode}
        />
      )}

      {/* ACTION SHEET XÁC NHẬN XÓA HÀNG LOẠT NHIỀU ẢNH */}
      {isConfirmDeleteBatchOpen && (
        <div
          onClick={() => {
            if (!isDeletingBatch) setIsConfirmDeleteBatchOpen(false);
          }}
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 animate-in fade-in duration-200"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm bg-[#1c1c1e] border border-neutral-800 rounded-3xl overflow-hidden text-center shadow-2xl p-5 space-y-4 animate-in zoom-in-95 duration-200"
          >
            <div>
              <h4 className="text-lg font-bold text-white">
                Xóa {selectedPhotoIds.size} bức ảnh?
              </h4>
              <p className="text-xs sm:text-sm text-neutral-400 mt-1 leading-relaxed px-2">
                Các ảnh đã chọn sẽ bị xóa vĩnh viễn khỏi thiết bị và Kênh Telegram của bạn.
              </p>
            </div>

            <div className="space-y-2.5 pt-1">
              <button
                type="button"
                disabled={isDeletingBatch}
                onClick={handleExecuteDeleteBatch}
                className="w-full py-3.5 bg-red-600 text-white font-extrabold rounded-2xl text-base flex items-center justify-center gap-2 active:bg-red-700 transition-colors disabled:opacity-50 shadow-lg"
              >
                {isDeletingBatch ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    <span>Đang xóa {selectedPhotoIds.size} ảnh...</span>
                  </>
                ) : (
                  `Xóa ${selectedPhotoIds.size} ảnh vĩnh viễn`
                )}
              </button>

              <button
                type="button"
                disabled={isDeletingBatch}
                onClick={() => setIsConfirmDeleteBatchOpen(false)}
                className="w-full py-3.5 bg-neutral-800 text-white font-bold rounded-2xl text-base active:bg-neutral-700 transition-colors"
              >
                Hủy
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fullscreen Photo Viewer Modal */}
      {selectedPhoto && (
        <PhotoViewer
          photo={selectedPhoto}
          allPhotos={
            selectedUserAlbum
              ? currentAlbumPhotos
              : selectedAlbum
              ? selectedAlbum.photos
              : filteredPhotos
          }
          config={config}
          isFavorite={
            favorites.has(String(selectedPhoto.id)) ||
            favorites.has(String(selectedPhoto.messageId))
          }
          onToggleFavorite={toggleFavorite}
          onClose={() => setSelectedPhoto(null)}
          onSelectPhoto={(p) => setSelectedPhoto(p)}
          onDeletePhoto={async (messageId) => {
            await removePhotoFromCache(messageId);
            setPhotos((prev) => prev.filter((p) => p.messageId !== messageId));
            if (selectedUserAlbum) {
              removePhotoFromAlbum(selectedUserAlbum.id, messageId);
              setUserAlbums(getUserAlbums());
            }
            await deleteTelegramPhoto(config, messageId);
          }}
        />
      )}

      {/* Settings Modal (Cấu hình thu gọn Drilldown, Theme, Tác giả Diễn Nguyễn, Auto-sync) */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        config={config}
        onSave={handleSaveConfig}
        onCacheCleared={() => setPhotos([])}
        theme={theme}
        onThemeChange={handleThemeChange}
        isDarkMode={isDarkMode}
        autoSync={autoSync}
        onAutoSyncChange={handleAutoSyncChange}
        onTriggerSyncNow={() => {
          setIsSettingsOpen(false);
          executeAutoSync(true);
        }}
      />
    </div>
  );
};

export default App;
