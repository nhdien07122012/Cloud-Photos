/**
 * App.tsx - Ứng dụng Telegram Cloud Drive (TeleDrive)
 * Quản lý, tải lên và tải xuống mọi định dạng tệp trên Kênh Telegram đám mây
 */

import { useState, useEffect, useMemo } from "react";
import type {
  CloudFile,
  FolderItem,
  TransferTask,
  TelegramConfig,
  ThemeMode,
  FileCategory,
} from "./types";
import {
  getStoredConfig,
  saveStoredConfig,
  fetchDriveFiles,
  uploadDriveFile,
  deleteDriveFiles,
  downloadTelegramFile,
  SAMPLE_FILES,
} from "./services/telegramDriveService";
import {
  getCachedFiles,
  getCustomFolders,
  saveCustomFolder,
  toggleStarFile,
  formatBytes,
  getDownloadedMessageIds,
} from "./services/fileStorage";
import { DriveHeader, type SortOption } from "./components/DriveHeader";
import { FileList } from "./components/FileList";
import { FileViewer } from "./components/FileViewer";
import { FolderModal } from "./components/FolderModal";
import { TransfersModal } from "./components/TransfersModal";
import { DriveTabBar, type DriveTab } from "./components/DriveTabBar";
import SettingsModal from "./components/SettingsModal";
import {
  Trash2,
  RefreshCw,
  DownloadCloud,
} from "lucide-react";

export function App() {
  // Cấu hình Telegram
  const [config, setConfig] = useState<TelegramConfig>(getStoredConfig);

  // Danh sách tệp & thư mục
  const [files, setFiles] = useState<CloudFile[]>([]);
  const [customFolders, setCustomFolders] = useState<FolderItem[]>([]);
  const [currentFolder, setCurrentFolder] = useState<string>("/");

  // Điều hướng & Tab
  const [currentTab, setCurrentTab] = useState<DriveTab>("drive");

  // Tìm kiếm, Lọc & Sắp xếp
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<FileCategory | "all" | "starred">("all");
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [sortOption, setSortOption] = useState<SortOption>("date_desc");

  // Chế độ chọn nhiều tệp
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedFileIds, setSelectedFileIds] = useState<Set<number>>(new Set());

  // Trình xem / tải tệp chi tiết
  const [selectedFileForViewer, setSelectedFileForViewer] = useState<CloudFile | null>(null);

  // Danh sách các tệp đã tải nội dung về Cache ứng dụng (Offline ready)
  const [downloadedFileIds, setDownloadedFileIds] = useState<Set<number>>(new Set());
  // Trạng thái các tệp đang tải xuống (messageId -> { progress, speed })
  const [activeDownloads, setActiveDownloads] = useState<Map<number, { progress: number; speed?: string }>>(new Map());

  // Tiến trình truyền tệp (Upload / Download)
  const [transferTasks, setTransferTasks] = useState<TransferTask[]>([]);
  const [isTransfersModalOpen, setIsTransfersModalOpen] = useState(false);

  // Modals
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Giao diện Sáng / Tối
  const [theme, setTheme] = useState<ThemeMode>(
    (localStorage.getItem("theme_mode") as ThemeMode) || "dark"
  );

  // Trạng thái tải & Toast thông báo
  const [isLoading, setIsLoading] = useState(false);
  const [toast, setShowToastState] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setShowToastState(msg);
    setTimeout(() => {
      setShowToastState(null);
    }, 2800);
  };

  // Áp dụng Theme giao diện
  useEffect(() => {
    document.body.classList.remove("theme-light", "theme-dark");
    if (theme === "light") {
      document.body.classList.add("theme-light");
    } else {
      document.body.classList.add("theme-dark");
    }
    localStorage.setItem("theme_mode", theme);
  }, [theme]);

  // Khởi động nhanh: Đọc cache IndexedDB trước (<50ms)
  useEffect(() => {
    let active = true;

    async function loadInitialData() {
      try {
        const [cachedFiles, savedFolders, cachedBlobsSet] = await Promise.all([
          getCachedFiles(),
          getCustomFolders(),
          getDownloadedMessageIds(),
        ]);
        if (active) {
          if (cachedFiles.length > 0) {
            setFiles(cachedFiles);
          } else if (!config.isLoggedIn) {
            setFiles(SAMPLE_FILES);
          }
          setCustomFolders(savedFolders);
          setDownloadedFileIds(cachedBlobsSet);
        }
      } catch (err) {
        console.warn("Lỗi đọc cache khởi động:", err);
      }

      // Nếu đã đăng nhập MTProto, đồng bộ ngầm với Kênh Telegram
      if (config.isLoggedIn && config.apiId && config.apiHash) {
        refreshFilesFromChannel(false);
      }
    }

    loadInitialData();
    return () => {
      active = false;
    };
  }, [config.isLoggedIn]);

  // Hàm làm mới danh sách tệp từ Kênh Telegram
  const refreshFilesFromChannel = async (showLoadingSpinner = true, targetConfig?: TelegramConfig) => {
    const cfg = targetConfig || config;
    if (!cfg.isLoggedIn && !cfg.sessionString) {
      if (showLoadingSpinner) {
        showToast("Vui lòng vào Cài đặt để kết nối tài khoản Telegram!");
      }
      return;
    }

    if (showLoadingSpinner) setIsLoading(true);
    try {
      const channelFiles = await fetchDriveFiles(cfg, 150);
      setFiles(channelFiles);
      if (showLoadingSpinner) {
        showToast(`Đã đồng bộ ${channelFiles.length} tệp từ Kênh 🚀`);
      }
    } catch (err: any) {
      console.warn("Lỗi đồng bộ tệp:", err);
      if (showLoadingSpinner) {
        showToast("Lỗi đồng bộ: " + (err.message || "Kiểm tra kết nối"));
      }
    } finally {
      if (showLoadingSpinner) setIsLoading(false);
    }
  };

  // Tính toán danh sách Thư mục động (từ trường folder của tệp + thư mục tự tạo)
  const allFolders: FolderItem[] = useMemo(() => {
    const folderMap = new Map<string, { count: number; size: number }>();

    // Thêm các thư mục tự tạo vào map
    for (const cf of customFolders) {
      folderMap.set(cf.name, { count: 0, size: 0 });
    }

    // Đếm tệp và dung lượng cho từng thư mục
    for (const f of files) {
      if (f.folder && f.folder !== "/") {
        const cur = folderMap.get(f.folder) || { count: 0, size: 0 };
        cur.count++;
        cur.size += f.size || 0;
        folderMap.set(f.folder, cur);
      }
    }

    return Array.from(folderMap.entries()).map(([name, data]) => ({
      id: `folder-${name}`,
      name,
      path: `/${name}`,
      fileCount: data.count,
      totalSize: data.size,
      totalSizeFormatted: formatBytes(data.size),
      createdAt: Date.now(),
    }));
  }, [files, customFolders]);

  // Lọc và Sắp xếp tệp tin
  const displayedFiles = useMemo(() => {
    let result = [...files];

    // 1. Lọc theo Tab Gần đây
    if (currentTab === "recent") {
      result.sort((a, b) => b.date.getTime() - a.date.getTime());
      return result.slice(0, 40);
    }

    // 2. Lọc theo Thư mục hiện tại (nếu đang duyệt theo thư mục và không bật bộ lọc danh mục)
    if (selectedCategory === "all" && !searchQuery.trim()) {
      if (currentFolder === "/") {
        // Ở thư mục gốc: hiện các tệp không nằm trong thư mục con nào
        result = result.filter((f) => !f.folder || f.folder === "/");
      } else {
        result = result.filter((f) => f.folder === currentFolder);
      }
    }

    // 3. Lọc theo Danh mục (Category)
    if (selectedCategory === "starred") {
      result = result.filter((f) => f.isStarred);
    } else if (selectedCategory !== "all") {
      result = result.filter((f) => f.category === selectedCategory);
    }

    // 4. Lọc theo Từ khóa tìm kiếm
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (f) =>
          f.name.toLowerCase().includes(q) ||
          f.extension.toLowerCase().includes(q) ||
          (f.caption && f.caption.toLowerCase().includes(q))
      );
    }

    // 5. Sắp xếp tệp
    switch (sortOption) {
      case "date_desc":
        result.sort((a, b) => b.date.getTime() - a.date.getTime());
        break;
      case "date_asc":
        result.sort((a, b) => a.date.getTime() - b.date.getTime());
        break;
      case "name_asc":
        result.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case "size_desc":
        result.sort((a, b) => b.size - a.size);
        break;
    }

    return result;
  }, [files, currentFolder, currentTab, selectedCategory, searchQuery, sortOption]);

  // Tổng dung lượng tệp
  const totalStorageFormatted = useMemo(() => {
    const totalBytes = files.reduce((acc, f) => acc + (f.size || 0), 0);
    return formatBytes(totalBytes);
  }, [files]);

  // Xử lý Tải tệp lên (Upload)
  const handleFilesSelected = async (selectedFiles: File[]) => {
    if (selectedFiles.length === 0) return;

    if (!config.isLoggedIn && !config.sessionString) {
      showToast("Vui lòng vào Cài đặt để kết nối Kênh Telegram trước khi tải tệp!");
      setIsSettingsOpen(true);
      return;
    }

    showToast(`Bắt đầu tải lên ${selectedFiles.length} tệp...`);

    // Tạo các tác vụ truyền tệp
    const newTasks: TransferTask[] = selectedFiles.map((f, idx) => ({
      id: `up-${Date.now()}-${idx}`,
      name: f.name,
      size: f.size,
      sizeFormatted: formatBytes(f.size),
      type: "upload",
      status: "pending",
      progress: 0,
      createdAt: Date.now(),
    }));

    setTransferTasks((prev) => [...newTasks, ...prev]);

    // Tiến hành upload từng tệp
    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];
      const taskId = newTasks[i].id;

      setTransferTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, status: "running" } : t))
      );

      try {
        const uploaded = await uploadDriveFile(
          config,
          file,
          currentFolder,
          (percent, speed) => {
            setTransferTasks((prev) =>
              prev.map((t) =>
                t.id === taskId ? { ...t, progress: Math.round(percent), speed } : t
              )
            );
          }
        );

        setTransferTasks((prev) =>
          prev.map((t) =>
            t.id === taskId ? { ...t, status: "completed", progress: 100 } : t
          )
        );

        setFiles((prev) => [uploaded, ...prev]);
        showToast(`Đã tải lên: ${file.name} ✅`);
      } catch (err: any) {
        console.error(`Lỗi upload ${file.name}:`, err);
        setTransferTasks((prev) =>
          prev.map((t) =>
            t.id === taskId ? { ...t, status: "error", error: err.message } : t
          )
        );
        showToast(`Lỗi tải lên ${file.name}: ${err.message || "Thử lại sau"}`);
      }
    }
  };

  // Đánh dấu sao / Bỏ sao
  const handleToggleStar = async (messageId: number) => {
    const isNowStarred = await toggleStarFile(messageId);
    setFiles((prev) =>
      prev.map((f) => (f.messageId === messageId ? { ...f, isStarred: isNowStarred } : f))
    );
    showToast(isNowStarred ? "Đã gắn dấu sao ⭐" : "Đã bỏ dấu sao");
  };

  // Xóa tệp đơn lẻ
  const handleDeleteFile = async (file: CloudFile) => {
    if (!window.confirm(`Xóa vĩnh viễn tệp "${file.name}" khỏi Kênh Telegram?`)) {
      return;
    }
    showToast(`Đang xóa ${file.name}...`);
    try {
      await deleteDriveFiles(config, [file.messageId]);
      setFiles((prev) => prev.filter((f) => f.messageId !== file.messageId));
      if (selectedFileForViewer?.messageId === file.messageId) {
        setSelectedFileForViewer(null);
      }
      showToast("Đã xóa tệp vĩnh viễn 🗑️");
    } catch (err: any) {
      showToast("Lỗi khi xóa tệp: " + (err.message || "Thử lại sau"));
    }
  };

  // Tải tệp từ Telegram vào bộ nhớ tạm ứng dụng Cloud (LƯU TẠM - Không ghi vào tệp của thiết bị)
  const handleDownloadFileToApp = async (file: CloudFile) => {
    if (downloadedFileIds.has(file.messageId)) {
      showToast(`Tệp "${file.name}" đã được lưu sẵn trong Cloud app (xem offline) 📁`);
      return;
    }

    const taskId = `dl-${file.messageId}-${Date.now()}`;
    const newTask: TransferTask = {
      id: taskId,
      name: file.name,
      size: file.size,
      sizeFormatted: file.sizeFormatted,
      type: "download",
      status: "running",
      progress: 0,
      speed: "Đang kết nối...",
      createdAt: Date.now(),
    };

    setTransferTasks((prev) => [newTask, ...prev.filter((t) => t.id !== taskId)]);
    setActiveDownloads((prev) => {
      const next = new Map(prev);
      next.set(file.messageId, { progress: 0, speed: "Đang kết nối..." });
      return next;
    });
    showToast(`Đang tải ${file.name} vào Cloud app...`);

    try {
      await downloadTelegramFile(config, file.messageId, (percent, speed) => {
        setTransferTasks((prev) =>
          prev.map((t) => (t.id === taskId ? { ...t, progress: Math.round(percent), speed } : t))
        );
        setActiveDownloads((prev) => {
          const next = new Map(prev);
          next.set(file.messageId, { progress: Math.round(percent), speed });
          return next;
        });
      });

      setTransferTasks((prev) =>
        prev.map((t) =>
          t.id === taskId ? { ...t, status: "completed", progress: 100, speed: "Đã lưu tạm" } : t
        )
      );
      setActiveDownloads((prev) => {
        const next = new Map(prev);
        next.delete(file.messageId);
        return next;
      });
      setDownloadedFileIds((prev) => new Set(prev).add(file.messageId));
      showToast(`Đã lưu tạm "${file.name}" vào Cloud app thành công! ✅`);
    } catch (err: any) {
      console.error(`Lỗi tải ${file.name}:`, err);
      setTransferTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, status: "error", error: err.message } : t))
      );
      setActiveDownloads((prev) => {
        const next = new Map(prev);
        next.delete(file.messageId);
        return next;
      });
      showToast(`Lỗi tải ${file.name}: ${err.message || "Thử lại sau"}`);
    }
  };

  // Tạo thư mục mới
  const handleCreateFolder = async (folderName: string, color?: string) => {
    const newFolder: FolderItem = {
      id: `folder-${Date.now()}`,
      name: folderName,
      path: `/${folderName}`,
      fileCount: 0,
      totalSize: 0,
      totalSizeFormatted: "0 B",
      createdAt: Date.now(),
      color,
    };
    await saveCustomFolder(newFolder);
    setCustomFolders((prev) => [...prev, newFolder]);
    showToast(`Đã tạo thư mục "${folderName}" 📁`);
  };

  // Xóa các tệp đã chọn trong chế độ chọn nhiều
  const handleDeleteSelected = async () => {
    const ids = Array.from(selectedFileIds);
    if (ids.length === 0) return;
    if (!window.confirm(`Xóa vĩnh viễn ${ids.length} tệp đã chọn khỏi Kênh Telegram?`)) {
      return;
    }
    showToast(`Đang xóa ${ids.length} tệp...`);
    try {
      await deleteDriveFiles(config, ids);
      setFiles((prev) => prev.filter((f) => !selectedFileIds.has(f.messageId)));
      setSelectedFileIds(new Set());
      setIsSelectionMode(false);
      showToast(`Đã xóa thành công ${ids.length} tệp 🗑️`);
    } catch (err: any) {
      showToast("Lỗi khi xóa tệp: " + (err.message || "Thử lại"));
    }
  };

  // Toggle chọn tệp
  const handleToggleSelectFile = (messageId: number) => {
    setSelectedFileIds((prev) => {
      const next = new Set(prev);
      if (next.has(messageId)) next.delete(messageId);
      else next.add(messageId);
      return next;
    });
  };

  const activeTransfersCount = transferTasks.filter(
    (t) => t.status === "running" || t.status === "pending"
  ).length;

  // Tác vụ download đang chạy gần nhất để hiển thị Banner tiến trình thời gian thực
  const activeDownloadTask = transferTasks.find(
    (t) => t.type === "download" && t.status === "running"
  );

  return (
    <div className="min-h-screen bg-black text-white flex flex-col font-sans select-none overflow-x-hidden">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-14 landscape:top-8 inset-x-0 mx-auto w-fit z-50 px-4 py-2 bg-neutral-800/95 border border-neutral-700/80 backdrop-blur-xl text-white text-xs font-semibold rounded-full shadow-2xl animate-in fade-in duration-200 flex items-center gap-2">
          <span>{toast}</span>
        </div>
      )}

      {/* Main Drive Header */}
      <DriveHeader
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
        viewMode={viewMode}
        onToggleViewMode={() => setViewMode((v) => (v === "list" ? "grid" : "list"))}
        sortOption={sortOption}
        onSortChange={setSortOption}
        isSelectionMode={isSelectionMode}
        onToggleSelectionMode={() => {
          setIsSelectionMode(!isSelectionMode);
          if (isSelectionMode) setSelectedFileIds(new Set());
        }}
        selectedCount={selectedFileIds.size}
        totalFilesCount={files.length}
        totalStorageFormatted={totalStorageFormatted}
        currentFolder={currentFolder}
        onNavigateHome={() => setCurrentFolder("/")}
        isLoggedIn={!!config.isLoggedIn}
        onOpenSettings={() => setIsSettingsOpen(true)}
        channelTitle={config.channelTitle || config.channelId || "IPA-MOD [DienNguyen]"}
      />

      {/* Main File Content Body */}
      <main className="flex-1 flex flex-col">
        {isLoading ? (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center text-neutral-400">
            <RefreshCw className="w-8 h-8 animate-spin text-blue-400 mb-3" />
            <p className="text-xs font-medium">Đang tải danh sách tệp từ Telegram...</p>
          </div>
        ) : (
          <FileList
            files={displayedFiles}
            folders={allFolders}
            currentFolder={currentFolder}
            onSelectFolder={(folderName) => setCurrentFolder(folderName)}
            onCreateFolder={() => setIsFolderModalOpen(true)}
            viewMode={viewMode}
            isSelectionMode={isSelectionMode}
            selectedIds={selectedFileIds}
            onToggleSelectFile={handleToggleSelectFile}
            onOpenFile={(file) => setSelectedFileForViewer(file)}
            onToggleStar={handleToggleStar}
            onDownloadFile={handleDownloadFileToApp}
            onDeleteFile={handleDeleteFile}
            onOpenUpload={() => {
              const el = document.querySelector('input[type="file"]') as HTMLInputElement;
              el?.click();
            }}
            downloadedFileIds={downloadedFileIds}
            activeDownloads={activeDownloads}
          />
        )}
      </main>

      {/* Floating Action Bar khi đang ở chế độ chọn nhiều tệp */}
      {isSelectionMode && selectedFileIds.size > 0 && (
        <div className="fixed bottom-20 inset-x-4 z-40 max-w-sm mx-auto bg-neutral-900/95 border border-neutral-700/80 backdrop-blur-xl p-3 rounded-2xl shadow-2xl flex items-center justify-between animate-in slide-in-from-bottom duration-200">
          <span className="text-xs font-bold text-white pl-2">
            Đã chọn {selectedFileIds.size} tệp
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDeleteSelected}
              className="px-3.5 py-2 bg-red-600/90 hover:bg-red-600 active:scale-95 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all shadow-md"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Xóa</span>
            </button>
            <button
              onClick={() => {
                setSelectedFileIds(new Set());
                setIsSelectionMode(false);
              }}
              className="px-3 py-2 bg-neutral-800 text-neutral-300 text-xs font-semibold rounded-xl"
            >
              Đóng
            </button>
          </div>
        </div>
      )}

      {/* File Viewer / Player Modal */}
      {selectedFileForViewer && (
        <FileViewer
          file={selectedFileForViewer}
          config={config}
          onClose={() => setSelectedFileForViewer(null)}
          onToggleStar={handleToggleStar}
          onDeleteFile={handleDeleteFile}
          showToast={showToast}
          isCached={downloadedFileIds.has(selectedFileForViewer.messageId)}
          onDownloadToApp={handleDownloadFileToApp}
        />
      )}

      {/* Folder Creation Modal */}
      <FolderModal
        isOpen={isFolderModalOpen}
        onClose={() => setIsFolderModalOpen(false)}
        onCreateFolder={handleCreateFolder}
      />

      {/* Transfers Progress Modal */}
      <TransfersModal
        isOpen={isTransfersModalOpen}
        onClose={() => setIsTransfersModalOpen(false)}
        tasks={transferTasks}
        onClearCompleted={() =>
          setTransferTasks((prev) => prev.filter((t) => t.status !== "completed"))
        }
      />

      {/* Settings Modal (Cấu hình Telegram, iCloud Backup, Theme) */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        config={config}
        onSave={(newCfg) => {
          setConfig(newCfg);
          saveStoredConfig(newCfg);
          setFiles([]);
          showToast(`Đang chuyển sang: ${newCfg.channelTitle || newCfg.channelId || "Kênh mới"}...`);
          refreshFilesFromChannel(true, newCfg);
        }}
        theme={theme}
        onThemeChange={setTheme}
        isDarkMode={theme === "dark"}
        onRefreshPhotos={(customCfg) => refreshFilesFromChannel(true, customCfg || config)}
      />

      {/* Floating Download Progress Banner (Hiện tiến trình thời gian thực khi đang tải) */}
      {activeDownloadTask && (
        <div
          onClick={() => setIsTransfersModalOpen(true)}
          className="fixed bottom-20 inset-x-4 max-w-md mx-auto z-40 bg-neutral-900/95 border border-blue-500/40 backdrop-blur-xl p-3 rounded-2xl shadow-2xl flex items-center justify-between gap-3 cursor-pointer active:scale-98 transition-all animate-in slide-in-from-bottom duration-200"
        >
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div className="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
              <DownloadCloud className="w-4 h-4 animate-bounce" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between text-xs font-semibold mb-1">
                <span className="truncate text-white max-w-[180px]">{activeDownloadTask.name}</span>
                <span className="text-blue-400 font-mono font-bold ml-2 shrink-0">{activeDownloadTask.progress}%</span>
              </div>
              <div className="w-full bg-neutral-800 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-blue-500 to-indigo-500 h-1.5 rounded-full transition-all duration-200"
                  style={{ width: `${activeDownloadTask.progress}%` }}
                />
              </div>
              {activeDownloadTask.speed && (
                <div className="text-[10px] text-neutral-400 mt-1 flex items-center justify-between">
                  <span>Tốc độ: {activeDownloadTask.speed}</span>
                  <span className="text-blue-400 font-medium">Lưu tạm vào Cloud app</span>
                </div>
              )}
            </div>
          </div>
          <span className="text-[10px] text-blue-400 font-bold shrink-0 bg-blue-500/10 px-2.5 py-1 rounded-lg">
            Chi tiết ➔
          </span>
        </div>
      )}

      {/* Bottom Navigation Tab Bar */}
      <DriveTabBar
        currentTab={currentTab}
        onSelectTab={(tab) => {
          if (tab === "transfers") {
            setIsTransfersModalOpen(true);
          } else if (tab === "settings") {
            setIsSettingsOpen(true);
          } else {
            setCurrentTab(tab);
          }
        }}
        activeTransfersCount={activeTransfersCount}
        onFilesSelected={handleFilesSelected}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />
    </div>
  );
}

export default App;
