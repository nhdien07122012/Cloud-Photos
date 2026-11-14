import React, { useState, useEffect, useRef } from "react";
import type { TelegramConfig, ThemeMode, PhotoItem } from "../types";
import {
  X,
  Key,
  ShieldCheck,
  Hash,
  Check,
  ExternalLink,
  Phone,
  Lock,
  LogOut,
  RefreshCw,
  Database,
  Trash2,
  Cloud,
  Upload,
  Download,
  Copy,
  FileText,
  Moon,
  Sun,
  Laptop,
} from "lucide-react";
import { Share } from "@capacitor/share";
import { Clipboard } from "@capacitor/clipboard";
import {
  requestTelegramCode,
  verifyTelegramCode,
  logoutTelegram,
} from "../services/telegramClient";
import { getCacheStats, clearPhotoCache } from "../services/photoStorage";
import {
  getFreeableDevicePhotos,
  freeUpDeviceStorage,
} from "../services/autoSyncService";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: TelegramConfig;
  onSave: (config: TelegramConfig) => void;
  onCacheCleared?: () => void;
  theme: ThemeMode;
  onThemeChange: (theme: ThemeMode) => void;
  isDarkMode: boolean;
  photos?: PhotoItem[];
  onRefreshPhotos?: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  config,
  onSave,
  onCacheCleared,
  theme,
  onThemeChange,
  isDarkMode,
  photos = [],
  onRefreshPhotos,
}) => {
  const [formData, setFormData] = useState<TelegramConfig>(config);
  const [activeTab, setActiveTab] = useState<"api" | "login" | "backup">(
    config.apiId && config.apiHash && !config.isLoggedIn
      ? "login"
      : config.isLoggedIn
      ? "backup"
      : "api"
  );
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [phone, setPhone] = useState(config.phoneNumber || "");
  const [phoneCodeHash, setPhoneCodeHash] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [step, setStep] = useState<"phone" | "code" | "password">("phone");
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Bộ nhớ đệm ảnh (Offline Cache)
  const [cacheStats, setCacheStats] = useState<{
    count: number;
    sizeMB: string;
    photoCount?: number;
    videoCount?: number;
  }>({
    count: 0,
    sizeMB: "0",
    photoCount: 0,
    videoCount: 0,
  });

  // Giải phóng dung lượng iPhone (Free Up Space)
  const [freeableCount, setFreeableCount] = useState<number>(0);
  const [isScanningFreeable, setIsScanningFreeable] = useState(false);
  const [isFreeingUp, setIsFreeingUp] = useState(false);
  const [cleanupMessage, setCleanupMessage] = useState<string | null>(null);

  const checkFreeableSpace = async () => {
    setIsScanningFreeable(true);
    try {
      const freeable = await getFreeableDevicePhotos(photos);
      setFreeableCount(freeable.length);
    } catch {
      // ignore
    } finally {
      setIsScanningFreeable(false);
    }
  };

  const refreshCacheStats = async () => {
    const stats = await getCacheStats();
    setCacheStats(stats);
  };

  useEffect(() => {
    if (isOpen) {
      setFormData(config);
      setPhone(config.phoneNumber || "");
      refreshCacheStats();
      checkFreeableSpace();
      setCleanupMessage(null);
      setStatusMsg("");
      // Đặt tab mặc định: nếu đã đăng nhập thì ưu tiên tab "backup" giống insta_downloader
      if (config.isLoggedIn) {
        setActiveTab("backup");
      } else if (config.apiId && config.apiHash) {
        setActiveTab("login");
      } else {
        setActiveTab("api");
      }
    }
  }, [isOpen, config, photos]);

  const handleClearCache = async () => {
    const confirmed = window.confirm(
      "Xóa bộ nhớ đệm ảnh và video tạm thời trên iPhone? Dữ liệu trên Telegram vẫn an toàn 100%."
    );
    if (!confirmed) return;

    await clearPhotoCache();
    await refreshCacheStats();
    setStatusMsg("Đã dọn dẹp sạch bộ nhớ đệm ảnh & video!");
    if (onCacheCleared) onCacheCleared();
  };

  const handleFreeUpStorage = async () => {
    if (freeableCount === 0) return;
    const confirmed = window.confirm(
      `Bạn có chắc chắn muốn xóa ${freeableCount} ảnh đã sao lưu khỏi iPhone để giải phóng bộ nhớ máy?\n\n(Ảnh vẫn được lưu an toàn 100% trên Telegram. iPhone sẽ đưa ảnh vào mục "Đã xóa gần đây")`
    );
    if (!confirmed) return;

    setIsFreeingUp(true);
    setCleanupMessage("Đang yêu cầu iOS xóa ảnh khỏi thiết bị...");
    try {
      const res = await freeUpDeviceStorage(undefined, photos);
      setCleanupMessage(res.message);
      await checkFreeableSpace();
    } catch (err: any) {
      setCleanupMessage("Lỗi: " + (err.message || String(err)));
    } finally {
      setIsFreeingUp(false);
    }
  };

  const handleTriggerRestore = () => {
    fileInputRef.current?.click();
  };

  // --- SAO LƯU QUA ICLOUD DRIVE (TỆP) GIỐNG 100% INSTA_DOWNLOADER ---
  const handleExportBackup = async () => {
    if (!formData.apiId && !formData.apiHash) {
      setStatusMsg("Chưa có cấu hình API ID và API Hash để sao lưu.");
      return;
    }

    const sessionStr =
      formData.sessionString || localStorage.getItem("tg_session") || "";

    const backupPayload = {
      app: "CloudPhotos",
      version: "1.3.0",
      exportedAt: new Date().toISOString(),
      config: {
        apiId: formData.apiId,
        apiHash: formData.apiHash,
        channelId: formData.channelId,
        phoneNumber: formData.phoneNumber || phone,
        sessionString: sessionStr,
        isLoggedIn: formData.isLoggedIn,
      },
    };

    const jsonString = JSON.stringify(backupPayload, null, 2);
    const fileName = `cloudphotos-backup-${new Date().toISOString().slice(0, 10)}.json`;

    // 1. Thử dùng Web File API + navigator.share (chuẩn Share Sheet iOS 15+ xuất file sang Tệp / iCloud Drive)
    try {
      const file = new File([jsonString], fileName, { type: "application/json" });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: "CloudPhotos Backup",
          text: "Sao lưu cấu hình CloudPhotos lên iCloud Drive / Tệp",
        });
        setStatusMsg("Đang mở bảng chia sẻ. Chọn 'Lưu vào Tệp' để lưu vào iCloud Drive.");
        return;
      }
    } catch (err: any) {
      if (err.name === "AbortError") return;
      console.warn("navigator.share file failed:", err);
    }

    // 2. Thử dùng Capacitor Share plugin
    try {
      const canShare = await Share.canShare();
      if (canShare.value) {
        await Share.share({
          title: "Sao lưu cấu hình CloudPhotos",
          text: jsonString,
          dialogTitle: "Lưu cấu hình vào iCloud / Tệp",
        });
        setStatusMsg("Đã mở bảng chia sẻ! Hãy chọn 'Lưu vào Tệp' để lưu vào iCloud Drive.");
        return;
      }
    } catch (err: any) {
      if (err.name === "AbortError") return;
      console.warn("Capacitor Share failed:", err);
    }

    // 3. Fallback: Tải file trực tiếp
    try {
      const blob = new Blob([jsonString], { type: "application/json" });
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
      setStatusMsg("Đã tạo file sao lưu! Hãy lưu file này vào thư mục iCloud Drive.");
    } catch {
      setStatusMsg("Lỗi khi tạo file sao lưu.");
    }
  };

  const handleCopyConfig = async () => {
    const sessionStr =
      formData.sessionString || localStorage.getItem("tg_session") || "";

    const backupPayload = {
      app: "CloudPhotos",
      version: "1.3.0",
      exportedAt: new Date().toISOString(),
      config: {
        apiId: formData.apiId,
        apiHash: formData.apiHash,
        channelId: formData.channelId,
        phoneNumber: formData.phoneNumber || phone,
        sessionString: sessionStr,
        isLoggedIn: formData.isLoggedIn,
      },
    };

    const textToCopy = JSON.stringify(backupPayload, null, 2);
    try {
      await navigator.clipboard.writeText(textToCopy);
      setStatusMsg("Đã sao chép văn bản cấu hình vào bộ nhớ tạm (Clipboard)!");
    } catch {
      try {
        await Clipboard.write({ string: textToCopy });
        setStatusMsg("Đã sao chép văn bản cấu hình vào bộ nhớ tạm (Clipboard)!");
      } catch {
        setStatusMsg("Không thể sao chép vào bộ nhớ tạm.");
      }
    }
  };

  // --- KHÔI PHỤC TỪ FILE ICLOUD DRIVE (HỖ TRỢ CẢ INSTAPHOTOS LẪN CLOUDPHOTOS) ---
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = (event.target?.result as string) || "";
        let cfg: any = null;

        if (text.trim().startsWith("CPCONF:")) {
          const raw = atob(text.trim().slice(7));
          cfg = JSON.parse(raw);
        } else {
          const parsed = JSON.parse(text);
          cfg = parsed.config || parsed;
        }

        if (!cfg.apiId && !cfg.apiHash) {
          setStatusMsg("File không hợp lệ: Không tìm thấy API ID hoặc API Hash.");
          return;
        }

        const sessionStr = String(cfg.sessionString || "").trim();
        const restoredConfig: TelegramConfig = {
          apiId: String(cfg.apiId || "").trim(),
          apiHash: String(cfg.apiHash || "").trim(),
          botToken: String(cfg.botToken || formData.botToken || "").trim(),
          channelId: String(cfg.channelId || formData.channelId || "").trim(),
          phoneNumber: String(cfg.phoneNumber || "").trim(),
          sessionString: sessionStr,
          isLoggedIn: Boolean(cfg.isLoggedIn && sessionStr),
        };

        setFormData(restoredConfig);
        if (restoredConfig.phoneNumber) {
          setPhone(restoredConfig.phoneNumber);
        }
        if (sessionStr) {
          localStorage.setItem("tg_session", sessionStr);
        }

        onSave(restoredConfig);
        setSavedSuccess(true);
        setStatusMsg("🎉 Khôi phục cấu hình từ iCloud Drive thành công!");
        setTimeout(() => setSavedSuccess(false), 2500);
      } catch {
        setStatusMsg("Lỗi đọc file sao lưu. Vui lòng chọn đúng file .json đã xuất từ ứng dụng.");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const handleSendCode = async () => {
    if (!formData.apiId || !formData.apiHash) {
      setStatusMsg("Vui lòng nhập API ID và API Hash trước");
      setActiveTab("api");
      return;
    }
    if (!phone.trim()) {
      setStatusMsg("Vui lòng nhập số điện thoại Telegram (ví dụ: +84...)");
      return;
    }

    setLoading(true);
    setStatusMsg("");
    try {
      const res = await requestTelegramCode(
        formData.apiId,
        formData.apiHash,
        phone.trim()
      );
      setPhoneCodeHash(res.phoneCodeHash);
      setStep("code");
      setStatusMsg("Mã xác thực đã được gửi đến ứng dụng Telegram của bạn!");
    } catch (err: any) {
      setStatusMsg(err.message || "Lỗi gửi mã OTP");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!code.trim()) {
      setStatusMsg("Vui lòng nhập mã Telegram đã nhận");
      return;
    }

    setLoading(true);
    setStatusMsg("");
    try {
      const sessionString = await verifyTelegramCode(
        phone.trim(),
        phoneCodeHash,
        code.trim(),
        password
      );
      const updatedConfig: TelegramConfig = {
        ...formData,
        phoneNumber: phone.trim(),
        sessionString,
        isLoggedIn: true,
      };
      setFormData(updatedConfig);
      onSave(updatedConfig);
      setStatusMsg("Đăng nhập Telegram MTProto thành công! 🎉");
      setStep("phone");
    } catch (err: any) {
      if (err.errorMessage === "SESSION_PASSWORD_NEEDED") {
        setStep("password");
        setStatusMsg("Tài khoản yêu cầu mật khẩu xác thực 2 lớp (2FA)");
      } else {
        setStatusMsg(err.message || "Mã xác thực không hợp lệ");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    const confirmed = window.confirm("Bạn có chắc chắn muốn đăng xuất tài khoản Telegram này?");
    if (!confirmed) return;

    await logoutTelegram();
    const updatedConfig: TelegramConfig = {
      ...formData,
      sessionString: "",
      isLoggedIn: false,
    };
    setFormData(updatedConfig);
    onSave(updatedConfig);
    setStatusMsg("Đã đăng xuất tài khoản an toàn.");
  };

  const handleSubmitApi = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    setSavedSuccess(true);
    if (!formData.isLoggedIn && formData.apiId && formData.apiHash) {
      setTimeout(() => {
        setSavedSuccess(false);
        setActiveTab("login");
        setStatusMsg("Đã lưu API ID & Hash! Tiếp theo hãy nhập Số điện thoại để nhận mã xác thực Telegram.");
      }, 500);
    } else {
      setTimeout(() => {
        setSavedSuccess(false);
        setStatusMsg("Đã lưu cấu hình API thành công!");
      }, 500);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200">
      <div
        className={`w-full max-w-lg rounded-[32px] p-5 sm:p-7 shadow-2xl max-h-[92vh] overflow-y-auto transition-colors duration-200 ${
          isDarkMode
            ? "bg-[#161618] text-white border border-neutral-800"
            : "bg-[#f2f2f7] text-neutral-900 border border-neutral-300"
        }`}
      >
        {/* Header Modal - Cấu hình Telegram MTProto chuẩn giao diện InstaPhotos */}
        <div
          className={`flex items-center justify-between pb-3.5 mb-4 border-b ${
            isDarkMode ? "border-neutral-800" : "border-neutral-200"
          }`}
        >
          <h2 className="text-lg sm:text-xl font-bold flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-blue-500" />
            Cấu hình Telegram MTProto
          </h2>
          <button
            onClick={onClose}
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-transform active:scale-90 ${
              isDarkMode
                ? "bg-neutral-800 text-neutral-300 hover:text-white"
                : "bg-neutral-200 text-neutral-700 hover:text-black shadow-sm"
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Thanh chuyển Tab: [ Thông số API ] [ Đăng nhập MTProto ] [ ☁️ Sao lưu iCloud ] */}
        <div
          className={`flex p-1 rounded-2xl mb-4 ${
            isDarkMode ? "bg-neutral-800/80" : "bg-neutral-200/80"
          }`}
        >
          <button
            type="button"
            onClick={() => setActiveTab("api")}
            className={`flex-1 py-2 text-xs sm:text-sm font-bold rounded-xl transition-all cursor-pointer ${
              activeTab === "api"
                ? isDarkMode
                  ? "bg-neutral-700 text-white shadow-sm"
                  : "bg-white text-black shadow-sm"
                : isDarkMode
                ? "text-neutral-400 hover:text-neutral-200"
                : "text-neutral-600 hover:text-black"
            }`}
          >
            Thông số API
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("login")}
            className={`flex-1 py-2 text-xs sm:text-sm font-bold rounded-xl transition-all cursor-pointer ${
              activeTab === "login"
                ? isDarkMode
                  ? "bg-neutral-700 text-white shadow-sm"
                  : "bg-white text-black shadow-sm"
                : isDarkMode
                ? "text-neutral-400 hover:text-neutral-200"
                : "text-neutral-600 hover:text-black"
            }`}
          >
            Đăng nhập MTProto
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("backup")}
            className={`flex-1 py-2 text-xs sm:text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === "backup"
                ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                : isDarkMode
                ? "text-neutral-400 hover:text-neutral-200"
                : "text-neutral-600 hover:text-black"
            }`}
          >
            <Cloud className="w-4 h-4" />
            Sao lưu iCloud
          </button>
        </div>

        {/* Thông báo trạng thái nếu có */}
        {statusMsg && (
          <div
            className={`mb-4 p-3.5 rounded-2xl text-xs sm:text-sm font-medium flex items-center justify-between animate-in fade-in duration-200 leading-relaxed ${
              isDarkMode
                ? "bg-blue-950/70 border border-blue-800/80 text-blue-200"
                : "bg-blue-50 border border-blue-200 text-blue-900 shadow-sm"
            }`}
          >
            <span>{statusMsg}</span>
            <button
              onClick={() => setStatusMsg("")}
              className="text-xs font-bold ml-2 underline shrink-0 cursor-pointer"
            >
              Đóng
            </button>
          </div>
        )}

        {/* Input ẩn để chọn file .json từ iCloud Drive / Files */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".json,application/json"
          onChange={handleFileChange}
          className="hidden"
        />

        {/* ======================================================== */}
        {/* NỘI DUNG TAB 1: THÔNG SỐ API                             */}
        {/* ======================================================== */}
        {activeTab === "api" && (
          <form onSubmit={handleSubmitApi} className="space-y-4 mb-5">
            {/* Quick restore banner */}
            {(!formData.apiId || !formData.apiHash) && (
              <div
                className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 ${
                  isDarkMode
                    ? "bg-blue-950/40 border-blue-800/50"
                    : "bg-blue-50 border-blue-200"
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Cloud className="w-4 h-4 text-blue-500 shrink-0" />
                  <p className="text-xs sm:text-sm font-medium truncate">
                    Đã có file sao lưu trên iCloud?
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleTriggerRestore}
                  className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white text-xs sm:text-sm font-semibold rounded-xl shrink-0 flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  Khôi phục
                </button>
              </div>
            )}

            <p className={`text-xs leading-relaxed ${isDarkMode ? "text-neutral-400" : "text-neutral-600"}`}>
              Lấy <b>API ID</b> & <b>API Hash</b> miễn phí tại:{" "}
              <a
                href="https://my.telegram.org/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500 font-semibold underline inline-flex items-center gap-0.5"
              >
                my.telegram.org <ExternalLink className="w-3 h-3" />
              </a>
            </p>

            <div>
              <label className="text-xs sm:text-sm font-semibold flex items-center gap-1.5 mb-1.5 text-neutral-400">
                <Key className="w-4 h-4 text-blue-500" />
                API ID:
              </label>
              <input
                type="text"
                placeholder="Ví dụ: 28471923"
                value={formData.apiId}
                onChange={(e) =>
                  setFormData({ ...formData, apiId: e.target.value.trim() })
                }
                className={`w-full rounded-2xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  isDarkMode
                    ? "bg-neutral-800/80 border border-neutral-700 text-white"
                    : "bg-white border border-neutral-300 text-black shadow-sm"
                }`}
              />
            </div>

            <div>
              <label className="text-xs sm:text-sm font-semibold flex items-center gap-1.5 mb-1.5 text-neutral-400">
                <ShieldCheck className="w-4 h-4 text-blue-500" />
                API HASH:
              </label>
              <input
                type="text"
                placeholder="Chuỗi hash 32 ký tự..."
                value={formData.apiHash}
                onChange={(e) =>
                  setFormData({ ...formData, apiHash: e.target.value.trim() })
                }
                className={`w-full rounded-2xl px-4 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  isDarkMode
                    ? "bg-neutral-800/80 border border-neutral-700 text-white"
                    : "bg-white border border-neutral-300 text-black shadow-sm"
                }`}
              />
            </div>

            <div>
              <label className="text-xs sm:text-sm font-semibold flex items-center gap-1.5 mb-1.5 text-neutral-400">
                <Hash className="w-4 h-4 text-blue-500" />
                ID Kênh lưu trữ:
              </label>
              <input
                type="text"
                placeholder="Ví dụ: -1004288667686 (để trống để tự động nhận diện)"
                value={formData.channelId}
                onChange={(e) =>
                  setFormData({ ...formData, channelId: e.target.value.trim() })
                }
                className={`w-full rounded-2xl px-4 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  isDarkMode
                    ? "bg-neutral-800/80 border border-neutral-700 text-white"
                    : "bg-white border border-neutral-300 text-black shadow-sm"
                }`}
              />
            </div>

            <div className="pt-2 flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className={`flex-1 py-3 font-semibold rounded-2xl text-sm transition-all cursor-pointer ${
                  isDarkMode
                    ? "bg-neutral-800 text-neutral-300 hover:bg-neutral-700"
                    : "bg-neutral-200 text-neutral-700 hover:bg-neutral-300"
                }`}
              >
                Hủy
              </button>
              <button
                type="submit"
                className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 active:scale-98 text-white font-bold rounded-2xl text-sm flex items-center justify-center gap-1.5 shadow-md shadow-blue-600/30 transition-all cursor-pointer"
              >
                {savedSuccess ? (
                  <>
                    <Check className="w-4 h-4" />
                    Đã lưu!
                  </>
                ) : (
                  "Lưu cấu hình"
                )}
              </button>
            </div>
          </form>
        )}

        {/* ======================================================== */}
        {/* NỘI DUNG TAB 2: ĐĂNG NHẬP MTPROTO                        */}
        {/* ======================================================== */}
        {activeTab === "login" && (
          <div className="space-y-4 mb-5">
            {formData.isLoggedIn ? (
              <div
                className={`p-5 rounded-2xl text-center border ${
                  isDarkMode
                    ? "bg-emerald-950/40 border-emerald-800/60"
                    : "bg-emerald-50 border-emerald-200 shadow-sm"
                }`}
              >
                <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-2.5">
                  <Check className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-emerald-400 text-base">
                  Đã kết nối Telegram cá nhân
                </h3>
                <p className={`text-xs sm:text-sm mt-1 leading-relaxed ${isDarkMode ? "text-neutral-400" : "text-neutral-600"}`}>
                  SĐT: <strong>{formData.phoneNumber || phone}</strong> • Kênh: <strong>{formData.channelId || "Kho ảnh đồng bộ"}</strong>
                </p>

                <div className="mt-4 flex flex-col gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      if (onRefreshPhotos) onRefreshPhotos();
                    }}
                    className={`w-full py-2.5 px-4 rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer border ${
                      isDarkMode
                        ? "border-neutral-700 bg-neutral-800 hover:bg-neutral-700 text-neutral-200"
                        : "border-neutral-300 bg-white hover:bg-neutral-100 text-neutral-800 shadow-sm"
                    }`}
                  >
                    <RefreshCw className="w-4 h-4 text-blue-400" />
                    Làm mới danh sách ảnh từ Telegram
                  </button>

                  <button
                    type="button"
                    onClick={handleLogout}
                    className="w-full py-2.5 px-4 bg-red-950/60 hover:bg-red-900/80 text-red-400 border border-red-800/60 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 active:scale-98 transition-all cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
                    Đăng xuất tài khoản
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <p className={`text-xs sm:text-sm leading-relaxed ${isDarkMode ? "text-neutral-400" : "text-neutral-600"}`}>
                  Đăng nhập tài khoản cá nhân để ứng dụng có toàn quyền đọc và tải ảnh/video vào kênh lưu trữ an toàn.
                </p>

                {step === "phone" && (
                  <div className="space-y-3">
                    <label className="text-xs sm:text-sm font-semibold flex items-center gap-1.5 text-neutral-400">
                      <Phone className="w-4 h-4 text-blue-500" />
                      Số điện thoại Telegram:
                    </label>
                    <input
                      type="tel"
                      placeholder="+84xxxxxxxxx"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className={`w-full rounded-2xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        isDarkMode
                          ? "bg-neutral-800/80 border border-neutral-700 text-white"
                          : "bg-white border border-neutral-300 text-black shadow-sm"
                      }`}
                    />
                    <button
                      type="button"
                      disabled={loading}
                      onClick={handleSendCode}
                      className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold rounded-2xl text-sm flex items-center justify-center gap-2 active:scale-98 transition-all shadow-md shadow-blue-600/30 cursor-pointer"
                    >
                      {loading ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        "Nhận mã xác nhận Telegram"
                      )}
                    </button>
                  </div>
                )}

                {step === "code" && (
                  <div className="space-y-3">
                    <label className="text-xs sm:text-sm font-semibold flex items-center gap-1.5 text-neutral-400">
                      <Lock className="w-4 h-4 text-blue-500" />
                      Nhập mã xác thực:
                    </label>
                    <input
                      type="text"
                      placeholder="12345"
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      className={`w-full rounded-2xl px-4 py-2.5 text-sm font-mono tracking-widest text-center focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        isDarkMode
                          ? "bg-neutral-800/80 border border-neutral-700 text-white"
                          : "bg-white border border-neutral-300 text-black shadow-sm"
                      }`}
                    />
                    <button
                      type="button"
                      disabled={loading}
                      onClick={handleVerifyCode}
                      className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold rounded-2xl text-sm flex items-center justify-center gap-2 active:scale-98 transition-all shadow-md shadow-emerald-600/30 cursor-pointer"
                    >
                      {loading ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        "Xác thực & Kết nối"
                      )}
                    </button>
                  </div>
                )}

                {step === "password" && (
                  <div className="space-y-3">
                    <label className="text-xs sm:text-sm font-semibold flex items-center gap-1.5 text-neutral-400">
                      <Lock className="w-4 h-4 text-purple-400" />
                      Mật khẩu xác thực 2 lớp (2FA):
                    </label>
                    <input
                      type="password"
                      placeholder="Nhập mật khẩu 2FA..."
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className={`w-full rounded-2xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                        isDarkMode
                          ? "bg-neutral-800/80 border border-neutral-700 text-white"
                          : "bg-white border border-neutral-300 text-black shadow-sm"
                      }`}
                    />
                    <button
                      type="button"
                      disabled={loading}
                      onClick={handleVerifyCode}
                      className="w-full py-3 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-bold rounded-2xl text-sm flex items-center justify-center gap-2 active:scale-98 transition-all shadow-md shadow-purple-600/30 cursor-pointer"
                    >
                      {loading ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        "Đăng nhập bằng 2FA"
                      )}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* NỘI DUNG TAB 3: SAO LƯU ICLOUD (GIỐNG 100% INSTA_DOWNLOADER) */}
        {/* ======================================================== */}
        {activeTab === "backup" && (
          <div className="space-y-4 mb-5">
            {/* Introduction Card */}
            <div
              className={`p-4 rounded-2xl border transition-all ${
                isDarkMode
                  ? "bg-gradient-to-br from-blue-950/40 to-neutral-900 border-blue-800/40"
                  : "bg-gradient-to-br from-blue-50 to-white border-blue-200 shadow-sm"
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-500 shrink-0">
                  <Cloud className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold">
                    Sao lưu & Khôi phục qua iCloud Drive
                  </h3>
                  <p className={`text-xs sm:text-sm mt-1 leading-relaxed ${isDarkMode ? "text-neutral-400" : "text-neutral-600"}`}>
                    Lưu toàn bộ <b>API ID, API Hash, ID Kênh</b> và <b>Phiên đăng nhập</b> vào iCloud Drive cá nhân qua ứng dụng <b>Tệp (Files)</b> của iPhone.
                  </p>
                </div>
              </div>
            </div>

            {/* Current Config Status Preview - Lưới 2x2 giống InstaPhotos */}
            <div
              className={`p-3.5 rounded-2xl border space-y-2 ${
                isDarkMode
                  ? "bg-neutral-800/60 border-neutral-700/60"
                  : "bg-neutral-100 border-neutral-300 shadow-sm"
              }`}
            >
              <div className="text-xs sm:text-sm font-semibold flex items-center gap-1.5 text-neutral-400">
                <FileText className="w-4 h-4 text-neutral-400" />
                Dữ liệu hiện tại:
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div
                  className={`p-2.5 rounded-xl border ${
                    isDarkMode
                      ? "bg-neutral-900/60 border-neutral-800"
                      : "bg-white border-neutral-200"
                  }`}
                >
                  <span className="text-neutral-500 block text-[11px] sm:text-xs">API ID:</span>
                  <span className="font-mono font-bold">
                    {formData.apiId ? `${formData.apiId.slice(0, 4)}••••` : "(Chưa có)"}
                  </span>
                </div>
                <div
                  className={`p-2.5 rounded-xl border ${
                    isDarkMode
                      ? "bg-neutral-900/60 border-neutral-800"
                      : "bg-white border-neutral-200"
                  }`}
                >
                  <span className="text-neutral-500 block text-[11px] sm:text-xs">API Hash:</span>
                  <span className="font-mono font-bold">
                    {formData.apiHash ? "Đã cấu hình" : "(Chưa có)"}
                  </span>
                </div>
                <div
                  className={`p-2.5 rounded-xl border ${
                    isDarkMode
                      ? "bg-neutral-900/60 border-neutral-800"
                      : "bg-white border-neutral-200"
                  }`}
                >
                  <span className="text-neutral-500 block text-[11px] sm:text-xs">ID Kênh:</span>
                  <span className="font-mono font-bold truncate block">
                    {formData.channelId || "(Chưa có)"}
                  </span>
                </div>
                <div
                  className={`p-2.5 rounded-xl border ${
                    isDarkMode
                      ? "bg-neutral-900/60 border-neutral-800"
                      : "bg-white border-neutral-200"
                  }`}
                >
                  <span className="text-neutral-500 block text-[11px] sm:text-xs">Đăng nhập:</span>
                  <span
                    className={
                      formData.isLoggedIn
                        ? "text-emerald-500 font-bold"
                        : "text-amber-500 font-semibold"
                    }
                  >
                    {formData.isLoggedIn ? "Đã kết nối" : "Chưa kết nối"}
                  </span>
                </div>
              </div>
            </div>

            {/* 3 Nút bấm thao tác chính xác như ảnh mẫu */}
            <div className="space-y-2.5 pt-1">
              {/* Nút 1: Xanh dương */}
              <button
                type="button"
                onClick={handleExportBackup}
                className="w-full py-3.5 px-4 bg-blue-600 hover:bg-blue-500 active:scale-[0.98] text-white font-bold rounded-2xl text-sm sm:text-base shadow-lg shadow-blue-600/25 flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Upload className="w-4 h-4" />
                Sao lưu ra iCloud Drive (Tệp)
              </button>

              {/* Nút 2: Xanh lá */}
              <button
                type="button"
                onClick={handleTriggerRestore}
                className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] text-white font-bold rounded-2xl text-sm sm:text-base shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Download className="w-4 h-4" />
                Khôi phục từ iCloud Drive (Tệp)
              </button>

              {/* Nút 3: Xám đen */}
              <button
                type="button"
                onClick={handleCopyConfig}
                className={`w-full py-3 px-4 active:scale-[0.98] font-semibold rounded-2xl text-xs sm:text-sm flex items-center justify-center gap-2 border transition-all cursor-pointer ${
                  isDarkMode
                    ? "bg-neutral-800 hover:bg-neutral-750 border-neutral-700 text-neutral-200"
                    : "bg-neutral-200 hover:bg-neutral-300 border-neutral-300 text-neutral-800 shadow-sm"
                }`}
              >
                <Copy className="w-3.5 h-3.5 text-neutral-400" />
                Sao chép văn bản cấu hình (Clipboard)
              </button>
            </div>

            {/* Chú thích bóng đèn */}
            <p className={`text-xs text-center leading-relaxed px-2 ${isDarkMode ? "text-neutral-400" : "text-neutral-500"}`}>
              💡 File sao lưu có đuôi <code className="font-mono font-bold">.json</code>. Bạn có thể lưu vào bất kỳ thư mục nào trên iCloud Drive để khôi phục nhanh khi cài lại máy.
            </p>
          </div>
        )}

        <div className="space-y-4 pt-2">
          {/* ======================================================== */}
          {/* MỤC BỘ NHỚ & DUNG LƯỢNG (STORAGE & CACHE)                */}
          {/* ======================================================== */}
          <div
            className={`p-5 rounded-3xl border transition-all ${
              isDarkMode
                ? "bg-neutral-900/90 border-neutral-800 shadow-sm"
                : "bg-white border-neutral-200 shadow-md"
            }`}
          >
            <h3 className="text-sm sm:text-base font-bold uppercase tracking-wider text-neutral-400 mb-3.5 flex items-center gap-2">
              <Database className="w-4 h-4 text-purple-400" />
              Bộ nhớ & Dung lượng
            </h3>

            {/* Giải phóng dung lượng iPhone */}
            <div className="space-y-3 mb-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm sm:text-base font-bold">Giải phóng dung lượng iPhone</h4>
                  <p className={`text-xs mt-0.5 leading-relaxed ${isDarkMode ? "text-neutral-400" : "text-neutral-600"}`}>
                    Xóa ảnh gốc trên máy đã được lưu an toàn trên Telegram
                  </p>
                </div>
                <button
                  type="button"
                  onClick={checkFreeableSpace}
                  disabled={isScanningFreeable}
                  className={`p-2 rounded-xl border text-neutral-400 active:scale-95 transition-transform ${
                    isDarkMode ? "border-neutral-800 bg-neutral-800/60" : "border-neutral-200 bg-neutral-100"
                  }`}
                  title="Quét lại"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isScanningFreeable ? "animate-spin text-purple-400" : ""}`} />
                </button>
              </div>

              <div
                className={`p-3 rounded-2xl flex items-center justify-between text-xs sm:text-sm ${
                  isDarkMode
                    ? "bg-neutral-800/50 border border-neutral-800"
                    : "bg-neutral-100/80 border border-neutral-200"
                }`}
              >
                <span className="font-medium text-neutral-400">Có thể dọn dẹp:</span>
                <span className="font-extrabold text-sm sm:text-base text-purple-400">
                  {freeableCount} ảnh an toàn
                </span>
              </div>

              {cleanupMessage && (
                <p className="text-xs sm:text-sm text-emerald-400 font-semibold px-1">{cleanupMessage}</p>
              )}

              <button
                type="button"
                disabled={freeableCount === 0 || isFreeingUp}
                onClick={handleFreeUpStorage}
                className="w-full py-3 px-4 bg-purple-600 hover:bg-purple-500 disabled:opacity-40 disabled:pointer-events-none active:scale-98 text-white font-bold rounded-2xl text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md shadow-purple-600/30 transition-all cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                {isFreeingUp ? "Đang xử lý..." : `Dọn dẹp ${freeableCount} ảnh khỏi iPhone`}
              </button>
            </div>

            <div className={`border-t my-3.5 ${isDarkMode ? "border-neutral-800" : "border-neutral-200"}`} />

            {/* Bộ nhớ đệm ảnh (Offline Cache) */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm sm:text-base font-bold">Bộ nhớ đệm tạm thời (Offline Cache)</h4>
                  <p className={`text-xs mt-0.5 leading-relaxed ${isDarkMode ? "text-neutral-400" : "text-neutral-600"}`}>
                    Tự động mở rộng theo lượng ảnh và video bạn tải lên để xem tức thì
                  </p>
                </div>
                <button
                  type="button"
                  onClick={refreshCacheStats}
                  className={`p-2 rounded-xl border text-neutral-400 active:scale-95 transition-transform ${
                    isDarkMode ? "border-neutral-800 bg-neutral-800/60" : "border-neutral-200 bg-neutral-100"
                  }`}
                  title="Cập nhật dung lượng bộ nhớ đệm"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-blue-400" />
                </button>
              </div>

              <div
                className={`p-3 rounded-2xl flex items-center justify-between text-xs sm:text-sm ${
                  isDarkMode
                    ? "bg-neutral-800/50 border border-neutral-800"
                    : "bg-neutral-100/80 border border-neutral-200"
                }`}
              >
                <span className="font-medium text-neutral-400">Đã lưu trong máy:</span>
                <span className="font-extrabold text-sm sm:text-base text-blue-400">
                  {cacheStats.sizeMB} MB • {cacheStats.count} tệp ({cacheStats.photoCount || 0} ảnh, {cacheStats.videoCount || 0} video)
                </span>
              </div>

              <button
                type="button"
                onClick={handleClearCache}
                className={`w-full py-2.5 px-4 rounded-2xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 active:scale-98 transition-all border cursor-pointer ${
                  isDarkMode
                    ? "border-red-500/30 bg-red-500/10 hover:bg-red-500/20 text-red-400"
                    : "border-red-300 bg-red-50 hover:bg-red-100 text-red-600"
                }`}
              >
                <Trash2 className="w-3.5 h-3.5" />
                Xóa sạch bộ nhớ đệm ảnh & video
              </button>
            </div>
          </div>

          {/* ======================================================== */}
          {/* MỤC GIAO DIỆN (THEME)                                    */}
          {/* ======================================================== */}
          <div
            className={`p-5 rounded-3xl border transition-all ${
              isDarkMode
                ? "bg-neutral-900/90 border-neutral-800 shadow-sm"
                : "bg-white border-neutral-200 shadow-md"
            }`}
          >
            <h3 className="text-sm sm:text-base font-bold uppercase tracking-wider text-neutral-400 mb-3 flex items-center gap-2">
              <Laptop className="w-4 h-4 text-amber-400" />
              Chế độ giao diện (Theme)
            </h3>
            <div
              className={`p-1.5 rounded-2xl grid grid-cols-3 gap-1.5 ${
                isDarkMode ? "bg-neutral-800/80" : "bg-neutral-100"
              }`}
            >
              <button
                type="button"
                onClick={() => onThemeChange("dark")}
                className={`py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  theme === "dark"
                    ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                    : isDarkMode
                    ? "text-neutral-400 hover:text-white"
                    : "text-neutral-600 hover:text-black"
                }`}
              >
                <Moon className="w-3.5 h-3.5" />
                Tối
              </button>
              <button
                type="button"
                onClick={() => onThemeChange("light")}
                className={`py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  theme === "light"
                    ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                    : isDarkMode
                    ? "text-neutral-400 hover:text-white"
                    : "text-neutral-600 hover:text-black"
                }`}
              >
                <Sun className="w-3.5 h-3.5" />
                Sáng
              </button>
              <button
                type="button"
                onClick={() => onThemeChange("system")}
                className={`py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  theme === "system"
                    ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                    : isDarkMode
                    ? "text-neutral-400 hover:text-white"
                    : "text-neutral-600 hover:text-black"
                }`}
              >
                <Laptop className="w-3.5 h-3.5" />
                Hệ thống
              </button>
            </div>
          </div>

          {/* ======================================================== */}
          {/* THÔNG TIN TÁC GIẢ & PHIÊN BẢN                           */}
          {/* ======================================================== */}
          <div
            className={`p-4 rounded-3xl border flex items-center justify-between transition-all ${
              isDarkMode
                ? "bg-neutral-900/60 border-neutral-800 text-neutral-300"
                : "bg-white border-neutral-200 text-neutral-700 shadow-sm"
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 text-white font-extrabold text-sm flex items-center justify-center shadow-md">
                DN
              </div>
              <div>
                <h4 className="text-sm sm:text-base font-bold">Diễn Nguyễn</h4>
                <p className="text-[11px] sm:text-xs text-neutral-400">Tác giả phát triển ứng dụng</p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-[11px] sm:text-xs font-bold px-2.5 py-0.5 rounded-full bg-blue-500/15 text-blue-400 border border-blue-500/25 block">
                Build 22
              </span>
              <span className="text-[10px] text-neutral-500 block mt-0.5">iOS Native</span>
            </div>
          </div>
        </div>

        {/* Footer Modal */}
        <div
          className={`mt-4 pt-3 text-center border-t ${
            isDarkMode ? "border-neutral-800/80" : "border-neutral-200"
          }`}
        >
          <p
            className={`text-[11px] font-semibold ${
              isDarkMode ? "text-neutral-500" : "text-neutral-400"
            }`}
          >
            CloudPhotos v1.3 • Build 22 • Made with ❤️ by Diễn Nguyễn
          </p>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
