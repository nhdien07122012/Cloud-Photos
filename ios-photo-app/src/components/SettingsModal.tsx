import React, { useState, useEffect, useRef } from "react";
import type { TelegramConfig, ThemeMode, PhotoItem } from "../types";
import {
  X,
  ShieldCheck,
  Phone,
  Lock,
  LogOut,
  RefreshCw,
  Database,
  Trash2,
  Moon,
  Sun,
  Laptop,
  Cloud,
  ChevronDown,
  ChevronUp,
  Copy,
  FileDown,
  FileUp,
  Key,
} from "lucide-react";
import {
  requestTelegramCode,
  verifyTelegramCode,
  logoutTelegram,
} from "../services/telegramClient";
import { getCacheStats, clearPhotoCache } from "../services/photoStorage";
import {
  getFreeableDevicePhotos,
  freeUpDeviceStorage,
  resetSyncedDeviceIds,
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
  const [phone, setPhone] = useState(config.phoneNumber || "");
  const [phoneCodeHash, setPhoneCodeHash] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [step, setStep] = useState<"phone" | "code" | "password">("phone");
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");
  const [showDeveloperApi, setShowDeveloperApi] = useState(false);
  const configFileInputRef = useRef<HTMLInputElement>(null);

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
    }
  }, [isOpen, config, photos]);

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

  const handleClearCache = async () => {
    const confirmed = window.confirm(
      "Xóa bộ nhớ đệm ảnh và video tạm thời trên iPhone? Dữ liệu trên Telegram vẫn an toàn 100%."
    );
    if (!confirmed) return;

    await clearPhotoCache();
    resetSyncedDeviceIds();
    setCacheStats({ count: 0, sizeMB: "0", photoCount: 0, videoCount: 0 });
    setStatusMsg("Đã dọn dẹp sạch bộ nhớ đệm tạm thời!");
    if (onCacheCleared) onCacheCleared();
  };

  // --- TÍNH NĂNG SAO LƯU & KHÔI PHỤC API ID / HASH KHI CHUYỂN MÁY ---
  const handleCopyConfigToken = async () => {
    if (!formData.apiId && !formData.apiHash) {
      setStatusMsg("Chưa có thông số API ID và Hash để sao lưu. Vui lòng nhập trước.");
      return;
    }
    try {
      const dataToSave = {
        apiId: formData.apiId,
        apiHash: formData.apiHash,
        phoneNumber: formData.phoneNumber || phone,
        channelId: formData.channelId,
      };
      const token = "CPCONF:" + btoa(unescape(encodeURIComponent(JSON.stringify(dataToSave))));
      await navigator.clipboard.writeText(token);
      setStatusMsg("Đã sao chép mã cấu hình vào bộ nhớ tạm! Bạn có thể lưu vào Ghi chú (Notes) hoặc tin nhắn để dán lại khi chuyển máy mới.");
    } catch {
      setStatusMsg("Không thể tự sao chép vào bộ nhớ tạm. Bạn có thể sử dụng nút 'Xuất tệp sao lưu' bên dưới.");
    }
  };

  const handlePasteConfigToken = async () => {
    let input = "";
    try {
      input = await navigator.clipboard.readText();
    } catch {
      input = "";
    }
    if (!input || !input.trim().startsWith("CPCONF:")) {
      input = window.prompt("Dán mã cấu hình (bắt đầu bằng CPCONF:...) vào đây:") || "";
    }
    if (!input.trim()) return;

    try {
      const clean = input.trim().replace(/^CPCONF:/, "");
      const jsonStr = decodeURIComponent(escape(atob(clean)));
      const parsed = JSON.parse(jsonStr);
      if (parsed.apiId || parsed.apiHash) {
        const updated: TelegramConfig = {
          ...formData,
          apiId: parsed.apiId || formData.apiId,
          apiHash: parsed.apiHash || formData.apiHash,
          phoneNumber: parsed.phoneNumber || formData.phoneNumber,
          channelId: parsed.channelId || formData.channelId,
        };
        setFormData(updated);
        if (parsed.phoneNumber) setPhone(parsed.phoneNumber);
        onSave(updated);
        setStatusMsg("Khôi phục API ID và API Hash thành công! Bạn có thể gửi mã xác thực để đăng nhập ngay. 🎉");
      } else {
        setStatusMsg("Mã cấu hình không chứa API ID hoặc API Hash hợp lệ.");
      }
    } catch {
      setStatusMsg("Mã cấu hình không hợp lệ hoặc đã bị lỗi ký tự.");
    }
  };

  const handleExportConfigFile = () => {
    if (!formData.apiId && !formData.apiHash) {
      setStatusMsg("Chưa có thông số API ID và Hash để xuất tệp.");
      return;
    }
    try {
      const dataToSave = {
        app: "CloudPhotos",
        version: "1.3",
        apiId: formData.apiId,
        apiHash: formData.apiHash,
        phoneNumber: formData.phoneNumber || phone,
        channelId: formData.channelId,
        exportedAt: new Date().toISOString(),
      };
      const blob = new Blob([JSON.stringify(dataToSave, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `CloudPhotos_API_Config.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setStatusMsg("Đã xuất tệp sao lưu cấu hình thành công!");
    } catch (e: any) {
      setStatusMsg("Lỗi khi xuất tệp: " + (e.message || String(e)));
    }
  };

  const handleImportConfigFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed.apiId || parsed.apiHash) {
          const updated: TelegramConfig = {
            ...formData,
            apiId: parsed.apiId || formData.apiId,
            apiHash: parsed.apiHash || formData.apiHash,
            phoneNumber: parsed.phoneNumber || formData.phoneNumber,
            channelId: parsed.channelId || formData.channelId,
          };
          setFormData(updated);
          if (parsed.phoneNumber) setPhone(parsed.phoneNumber);
          onSave(updated);
          setStatusMsg("Nhập tệp cấu hình API ID & Hash thành công! 🎉");
        } else {
          setStatusMsg("Tệp không chứa thông số API hợp lệ.");
        }
      } catch {
        setStatusMsg("Tệp JSON không hợp lệ.");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  if (!isOpen) return null;

  const handleSendCode = async () => {
    if (!formData.apiId || !formData.apiHash) {
      setStatusMsg("Vui lòng nhập API ID và API Hash trước");
      setShowDeveloperApi(true);
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
      setStatusMsg("Vui lòng nhập mã xác thực Telegram");
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

  const handleSaveApiCredentials = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    setStatusMsg("Đã lưu thông số kết nối Telegram thành công!");
    setTimeout(() => setStatusMsg(""), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200">
      <div
        className={`w-full max-w-lg rounded-[32px] p-6 sm:p-8 shadow-2xl max-h-[92vh] overflow-y-auto transition-colors duration-200 ${
          isDarkMode
            ? "bg-[#161618] text-white border border-neutral-800"
            : "bg-[#f2f2f7] text-neutral-900 border border-neutral-300"
        }`}
      >
        {/* Header Modal - Font chữ to rõ ràng chuẩn iOS 18 */}
        <div
          className={`flex items-center justify-between pb-4 mb-6 border-b ${
            isDarkMode ? "border-neutral-800" : "border-neutral-200"
          }`}
        >
          <div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight">Cài đặt</h2>
            <p className={`text-sm mt-1 font-medium ${isDarkMode ? "text-neutral-400" : "text-neutral-600"}`}>
              Quản lý sao lưu & lưu trữ đám mây
            </p>
          </div>
          <button
            onClick={onClose}
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-transform active:scale-90 ${
              isDarkMode
                ? "bg-neutral-800 text-neutral-300 hover:text-white"
                : "bg-neutral-200 text-neutral-700 hover:text-black shadow-sm"
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Thông báo trạng thái nếu có */}
        {statusMsg && (
          <div
            className={`mb-6 p-4 rounded-2xl text-sm font-medium flex items-center justify-between animate-in fade-in duration-200 leading-relaxed ${
              isDarkMode
                ? "bg-blue-950/70 border border-blue-800/80 text-blue-200"
                : "bg-blue-50 border border-blue-200 text-blue-900 shadow-sm"
            }`}
          >
            <span>{statusMsg}</span>
            <button
              onClick={() => setStatusMsg("")}
              className="text-sm font-bold ml-3 underline shrink-0 cursor-pointer"
            >
              Đóng
            </button>
          </div>
        )}

        {/* Input ẩn để nhập tệp JSON sao lưu cấu hình */}
        <input
          type="file"
          ref={configFileInputRef}
          accept=".json,application/json"
          className="hidden"
          onChange={handleImportConfigFile}
        />

        <div className="space-y-5">
          {/* ======================================================== */}
          {/* THẺ 1: QUẢN LÝ DUNG LƯỢNG (STORAGE & CACHE)              */}
          {/* ======================================================== */}
          <div
            className={`p-6 rounded-3xl border transition-all ${
              isDarkMode
                ? "bg-neutral-900/90 border-neutral-800 shadow-sm"
                : "bg-white border-neutral-200 shadow-md"
            }`}
          >
            <h3 className="text-base sm:text-lg font-bold uppercase tracking-wider text-neutral-400 mb-4 flex items-center gap-2.5">
              <Database className="w-5 h-5 text-purple-400" />
              Bộ nhớ & Dung lượng
            </h3>

            {/* Mục A: Giải phóng dung lượng iPhone */}
            <div className="space-y-3 mb-5">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-base sm:text-lg font-bold">Giải phóng dung lượng iPhone</h4>
                  <p className={`text-sm mt-0.5 leading-relaxed ${isDarkMode ? "text-neutral-400" : "text-neutral-600"}`}>
                    Xóa ảnh gốc trên máy đã được lưu an toàn trên Telegram
                  </p>
                </div>
                <button
                  type="button"
                  onClick={checkFreeableSpace}
                  disabled={isScanningFreeable}
                  className={`p-2.5 rounded-xl border text-neutral-400 active:scale-95 transition-transform ${
                    isDarkMode ? "border-neutral-800 bg-neutral-800/60" : "border-neutral-200 bg-neutral-100"
                  }`}
                  title="Quét lại"
                >
                  <RefreshCw className={`w-4 h-4 ${isScanningFreeable ? "animate-spin text-purple-400" : ""}`} />
                </button>
              </div>

              <div className={`p-3.5 rounded-2xl flex items-center justify-between text-sm ${
                isDarkMode ? "bg-neutral-800/50 border border-neutral-800" : "bg-neutral-100/80 border border-neutral-200"
              }`}>
                <span className="font-medium text-neutral-400">Có thể dọn dẹp:</span>
                <span className="font-extrabold text-base text-purple-400">
                  {freeableCount} ảnh an toàn
                </span>
              </div>

              {cleanupMessage && (
                <p className="text-sm text-emerald-400 font-semibold px-1">{cleanupMessage}</p>
              )}

              <button
                type="button"
                disabled={freeableCount === 0 || isFreeingUp}
                onClick={handleFreeUpStorage}
                className="w-full py-3.5 px-4 bg-purple-600 hover:bg-purple-500 disabled:opacity-40 disabled:pointer-events-none active:scale-98 text-white font-bold rounded-2xl text-sm sm:text-base flex items-center justify-center gap-2 shadow-md shadow-purple-600/30 transition-all cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                {isFreeingUp ? "Đang xử lý..." : `Dọn dẹp ${freeableCount} ảnh khỏi iPhone`}
              </button>
            </div>

            <div className={`border-t my-4 ${isDarkMode ? "border-neutral-800" : "border-neutral-200"}`} />

            {/* Mục B: Bộ nhớ đệm ảnh (Offline Cache) & Tối ưu hóa */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-base sm:text-lg font-bold">Bộ nhớ đệm tạm thời (Offline Cache)</h4>
                  <p className={`text-sm mt-0.5 leading-relaxed ${isDarkMode ? "text-neutral-400" : "text-neutral-600"}`}>
                    Tự động mở rộng theo lượng ảnh và video bạn tải lên để xem tức thì không cần tải lại
                  </p>
                </div>
                <button
                  type="button"
                  onClick={refreshCacheStats}
                  className={`p-2.5 rounded-xl border text-neutral-400 active:scale-95 transition-transform ${
                    isDarkMode ? "border-neutral-800 bg-neutral-800/60" : "border-neutral-200 bg-neutral-100"
                  }`}
                  title="Cập nhật dung lượng bộ nhớ đệm"
                >
                  <RefreshCw className="w-4 h-4 text-blue-400" />
                </button>
              </div>

              <div className={`p-3.5 rounded-2xl flex items-center justify-between text-sm ${
                isDarkMode ? "bg-neutral-800/50 border border-neutral-800" : "bg-neutral-100/80 border border-neutral-200"
              }`}>
                <span className="font-medium text-neutral-400">Đã lưu trong máy:</span>
                <span className="font-extrabold text-base text-blue-400">
                  {cacheStats.sizeMB} MB • {cacheStats.count} tệp ({cacheStats.photoCount || 0} ảnh, {cacheStats.videoCount || 0} video)
                </span>
              </div>

              <p className={`text-xs leading-relaxed px-1 ${isDarkMode ? "text-neutral-400" : "text-neutral-500"}`}>
                💡 Dữ liệu gốc và thumbnail được lưu vĩnh viễn trong IndexedDB của iPhone. Bạn tải lên hoặc xem càng nhiều thì dung lượng đệm sẽ tăng tương ứng để truy cập ngoại tuyến (offline) siêu mượt.
              </p>

              <button
                type="button"
                onClick={handleClearCache}
                className={`w-full py-3 px-4 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 active:scale-98 transition-all border cursor-pointer ${
                  isDarkMode
                    ? "border-red-500/30 bg-red-500/10 hover:bg-red-500/20 text-red-400"
                    : "border-red-300 bg-red-50 hover:bg-red-100 text-red-600"
                }`}
              >
                <Trash2 className="w-4 h-4" />
                Xóa sạch bộ nhớ đệm ảnh & video
              </button>
            </div>
          </div>

          {/* ======================================================== */}
          {/* THẺ 2: SAO LƯU & KHÔI PHỤC CẤU HÌNH (API ID & HASH)       */}
          {/* ======================================================== */}
          <div
            className={`p-6 rounded-3xl border transition-all ${
              isDarkMode
                ? "bg-neutral-900/90 border-neutral-800 shadow-sm"
                : "bg-white border-neutral-200 shadow-md"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-base sm:text-lg font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-2.5">
                <Key className="w-5 h-5 text-amber-400" />
                Sao lưu thông số API khi chuyển máy
              </h3>
              <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                Chuyển máy nhanh
              </span>
            </div>

            <p className={`text-sm leading-relaxed mb-4 ${isDarkMode ? "text-neutral-400" : "text-neutral-600"}`}>
              Sao lưu API ID & Hash của bạn để khi cài đặt lại ứng dụng hoặc đổi sang iPhone mới, bạn chỉ cần 1 chạm để khôi phục mà không cần nhập lại từ đầu.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-3">
              <button
                type="button"
                onClick={handleCopyConfigToken}
                className="py-3 px-4 bg-blue-600 hover:bg-blue-500 active:scale-98 text-white font-bold rounded-2xl text-sm flex items-center justify-center gap-2 shadow-md shadow-blue-600/20 transition-all cursor-pointer"
              >
                <Copy className="w-4 h-4" />
                Sao chép mã cấu hình
              </button>

              <button
                type="button"
                onClick={handlePasteConfigToken}
                className={`py-3 px-4 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 active:scale-98 transition-all border cursor-pointer ${
                  isDarkMode
                    ? "border-neutral-700 bg-neutral-800 hover:bg-neutral-700 text-white"
                    : "border-neutral-300 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 shadow-sm"
                }`}
              >
                <FileUp className="w-4 h-4 text-emerald-400" />
                Dán & Khôi phục mã
              </button>
            </div>

            <div className="flex items-center justify-between gap-2.5 pt-2 border-t border-neutral-800/60">
              <button
                type="button"
                onClick={handleExportConfigFile}
                className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors border cursor-pointer ${
                  isDarkMode
                    ? "border-neutral-800 bg-neutral-900 hover:bg-neutral-800 text-neutral-300"
                    : "border-neutral-200 bg-neutral-50 hover:bg-neutral-100 text-neutral-700"
                }`}
              >
                <FileDown className="w-3.5 h-3.5 text-blue-400" />
                Xuất tệp sao lưu (.json)
              </button>

              <button
                type="button"
                onClick={() => configFileInputRef.current?.click()}
                className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors border cursor-pointer ${
                  isDarkMode
                    ? "border-neutral-800 bg-neutral-900 hover:bg-neutral-800 text-neutral-300"
                    : "border-neutral-200 bg-neutral-50 hover:bg-neutral-100 text-neutral-700"
                }`}
              >
                <FileUp className="w-3.5 h-3.5 text-purple-400" />
                Chọn tệp (.json) để nhập
              </button>
            </div>
          </div>

          {/* ======================================================== */}
          {/* THẺ 3: TÀI KHOẢN & KÊNH TELEGRAM                         */}
          {/* ======================================================== */}
          <div
            className={`p-6 rounded-3xl border transition-all ${
              isDarkMode
                ? "bg-neutral-900/90 border-neutral-800 shadow-sm"
                : "bg-white border-neutral-200 shadow-md"
            }`}
          >
            <h3 className="text-base sm:text-lg font-bold uppercase tracking-wider text-neutral-400 mb-4 flex items-center gap-2.5">
              <Cloud className="w-5 h-5 text-blue-400" />
              Tài khoản & Kênh Telegram
            </h3>

            {formData.isLoggedIn ? (
              <div className="space-y-4">
                <div className={`p-4 rounded-2xl flex items-center justify-between ${
                  isDarkMode ? "bg-neutral-800/50 border border-neutral-800" : "bg-neutral-100/80 border border-neutral-200"
                }`}>
                  <div>
                    <span className="text-xs text-neutral-400 block font-medium">Số điện thoại kết nối:</span>
                    <span className="text-base sm:text-lg font-bold text-emerald-400">
                      {formData.phoneNumber || phone}
                    </span>
                  </div>
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    Đã kết nối MTProto
                  </span>
                </div>

                <div className={`p-3.5 rounded-2xl text-sm space-y-1.5 ${
                  isDarkMode ? "bg-neutral-800/30 text-neutral-300" : "bg-neutral-100 text-neutral-700"
                }`}>
                  <p>• Kênh lưu trữ: <strong>Kho ảnh đồng bộ Telegram</strong></p>
                  <p>• Channel ID: <strong>{formData.channelId || "Tự động nhận diện"}</strong></p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    if (onRefreshPhotos) onRefreshPhotos();
                  }}
                  className={`w-full py-3.5 px-4 rounded-2xl text-sm sm:text-base font-bold flex items-center justify-center gap-2 active:scale-98 transition-all border cursor-pointer ${
                    isDarkMode
                      ? "border-neutral-800 bg-neutral-900/80 hover:bg-neutral-800 text-neutral-200"
                      : "border-neutral-200 bg-neutral-100 hover:bg-neutral-200 text-neutral-800"
                  }`}
                >
                  <RefreshCw className="w-4 h-4 text-blue-400" />
                  Làm mới danh sách ảnh từ Telegram
                </button>

                <button
                  type="button"
                  onClick={handleLogout}
                  className={`w-full py-3 px-4 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 active:scale-98 transition-all border cursor-pointer ${
                    isDarkMode
                      ? "border-neutral-800 bg-neutral-800 hover:bg-neutral-700 text-neutral-300"
                      : "border-neutral-300 bg-neutral-200 hover:bg-neutral-300 text-neutral-700"
                  }`}
                >
                  <LogOut className="w-4 h-4 text-red-400" />
                  Đăng xuất tài khoản Telegram
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-sm text-amber-300 space-y-1.5">
                  <p className="font-bold flex items-center gap-2 text-base">
                    <ShieldCheck className="w-5 h-5 shrink-0" />
                    Chưa kết nối tài khoản Telegram
                  </p>
                  <p className="text-xs sm:text-sm leading-relaxed opacity-90">
                    Vui lòng nhập số điện thoại để nhận mã xác thực Telegram và lưu ảnh vào Kênh riêng tư.
                  </p>
                </div>

                {step === "phone" && (
                  <div className="space-y-3">
                    <label className="text-sm font-semibold block text-neutral-300">
                      Số điện thoại quốc tế (ví dụ: +84...)
                    </label>
                    <div className="relative">
                      <Phone className="w-5 h-5 text-neutral-400 absolute left-4 top-3.5" />
                      <input
                        type="tel"
                        placeholder="+84399962032"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className={`w-full pl-12 pr-4 py-3 rounded-2xl text-base focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          isDarkMode
                            ? "bg-neutral-800 border border-neutral-700 text-white"
                            : "bg-white border border-neutral-300 text-black"
                        }`}
                      />
                    </div>
                    <button
                      type="button"
                      disabled={loading}
                      onClick={handleSendCode}
                      className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold rounded-2xl text-base active:scale-98 transition-all cursor-pointer shadow-md"
                    >
                      {loading ? "Đang gửi mã..." : "Gửi mã xác thực OTP"}
                    </button>
                  </div>
                )}

                {step === "code" && (
                  <div className="space-y-3">
                    <label className="text-sm font-semibold block text-neutral-300">
                      Nhập mã xác thực Telegram (gửi qua app Telegram)
                    </label>
                    <input
                      type="text"
                      placeholder="12345"
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      className={`w-full px-4 py-3 rounded-2xl text-base focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        isDarkMode
                          ? "bg-neutral-800 border border-neutral-700 text-white"
                          : "bg-white border border-neutral-300 text-black"
                      }`}
                    />
                    <button
                      type="button"
                      disabled={loading}
                      onClick={handleVerifyCode}
                      className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold rounded-2xl text-base active:scale-98 transition-all cursor-pointer shadow-md"
                    >
                      {loading ? "Đang xác thực..." : "Xác nhận đăng nhập"}
                    </button>
                  </div>
                )}

                {step === "password" && (
                  <div className="space-y-3">
                    <label className="text-sm font-semibold block text-neutral-300">
                      Mật khẩu xác thực 2 lớp (2FA Password)
                    </label>
                    <div className="relative">
                      <Lock className="w-5 h-5 text-neutral-400 absolute left-4 top-3.5" />
                      <input
                        type="password"
                        placeholder="Mật khẩu Telegram của bạn"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className={`w-full pl-12 pr-4 py-3 rounded-2xl text-base focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          isDarkMode
                            ? "bg-neutral-800 border border-neutral-700 text-white"
                            : "bg-white border border-neutral-300 text-black"
                        }`}
                      />
                    </div>
                    <button
                      type="button"
                      disabled={loading}
                      onClick={handleVerifyCode}
                      className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold rounded-2xl text-base active:scale-98 transition-all cursor-pointer shadow-md"
                    >
                      {loading ? "Đang xác thực..." : "Đăng nhập với mật khẩu 2FA"}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Toggle hiển thị thông số API ID & Hash cho nhà phát triển */}
            <div className="mt-4 pt-3.5 border-t border-neutral-800/60">
              <button
                type="button"
                onClick={() => setShowDeveloperApi(!showDeveloperApi)}
                className="w-full text-sm font-semibold text-neutral-400 hover:text-white flex items-center justify-between py-1 transition-colors cursor-pointer"
              >
                <span>Tùy chỉnh thủ công API ID & API Hash (Developer)</span>
                {showDeveloperApi ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>

              {showDeveloperApi && (
                <form onSubmit={handleSaveApiCredentials} className="mt-3 space-y-3 animate-in fade-in duration-200">
                  <div>
                    <label className="text-xs font-semibold text-neutral-400 block mb-1">
                      API ID (từ my.telegram.org)
                    </label>
                    <input
                      type="text"
                      value={formData.apiId}
                      onChange={(e) => setFormData({ ...formData, apiId: e.target.value })}
                      placeholder="Ví dụ: 38786968"
                      className={`w-full px-4 py-2.5 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        isDarkMode
                          ? "bg-neutral-800 border border-neutral-700 text-white"
                          : "bg-white border border-neutral-300 text-black"
                      }`}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-neutral-400 block mb-1">
                      API Hash
                    </label>
                    <input
                      type="text"
                      value={formData.apiHash}
                      onChange={(e) => setFormData({ ...formData, apiHash: e.target.value })}
                      placeholder="Ví dụ: 994a3e..."
                      className={`w-full px-4 py-2.5 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        isDarkMode
                          ? "bg-neutral-800 border border-neutral-700 text-white"
                          : "bg-white border border-neutral-300 text-black"
                      }`}
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full py-3 bg-neutral-700 hover:bg-neutral-600 text-white font-bold rounded-2xl text-sm transition-colors cursor-pointer"
                  >
                    Lưu thông số API thủ công
                  </button>
                </form>
              )}
            </div>
          </div>

          {/* ======================================================== */}
          {/* THẺ 4: CHẾ ĐỘ GIAO DIỆN (THEME SELECTOR)                 */}
          {/* ======================================================== */}
          <div
            className={`p-6 rounded-3xl border transition-all ${
              isDarkMode
                ? "bg-neutral-900/90 border-neutral-800 shadow-sm"
                : "bg-white border-neutral-200 shadow-md"
            }`}
          >
            <h3 className="text-base sm:text-lg font-bold uppercase tracking-wider text-neutral-400 mb-4 flex items-center gap-2.5">
              <Sun className="w-5 h-5 text-amber-400" />
              Chế độ giao diện (Theme)
            </h3>

            <div className={`p-2 rounded-2xl grid grid-cols-3 gap-2 ${
              isDarkMode ? "bg-neutral-800/60" : "bg-neutral-100"
            }`}>
              <button
                type="button"
                onClick={() => onThemeChange("dark")}
                className={`py-3 px-3 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  theme === "dark"
                    ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                    : isDarkMode
                    ? "text-neutral-400 hover:text-white"
                    : "text-neutral-600 hover:text-black"
                }`}
              >
                <Moon className="w-4 h-4" />
                Tối
              </button>
              <button
                type="button"
                onClick={() => onThemeChange("light")}
                className={`py-3 px-3 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  theme === "light"
                    ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                    : isDarkMode
                    ? "text-neutral-400 hover:text-white"
                    : "text-neutral-600 hover:text-black"
                }`}
              >
                <Sun className="w-4 h-4" />
                Sáng
              </button>
              <button
                type="button"
                onClick={() => onThemeChange("system")}
                className={`py-3 px-3 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  theme === "system"
                    ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                    : isDarkMode
                    ? "text-neutral-400 hover:text-white"
                    : "text-neutral-600 hover:text-black"
                }`}
              >
                <Laptop className="w-4 h-4" />
                Hệ thống
              </button>
            </div>
          </div>

          {/* ======================================================== */}
          {/* THẺ 5: THÔNG TIN ỨNG DỤNG & TÁC GIẢ                     */}
          {/* ======================================================== */}
          <div
            className={`p-5 rounded-3xl border flex items-center justify-between transition-all ${
              isDarkMode
                ? "bg-neutral-900/60 border-neutral-800 text-neutral-300"
                : "bg-white border-neutral-200 text-neutral-700 shadow-sm"
            }`}
          >
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 text-white font-extrabold text-base flex items-center justify-center shadow-md">
                DN
              </div>
              <div>
                <h4 className="text-base font-bold">Diễn Nguyễn</h4>
                <p className="text-xs text-neutral-400">Tác giả phát triển ứng dụng</p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-blue-500/15 text-blue-400 border border-blue-500/25 block">
                Build 21
              </span>
              <span className="text-xs text-neutral-500 block mt-1">iOS Native</span>
            </div>
          </div>
        </div>

        {/* Footer Modal */}
        <div
          className={`mt-6 pt-4 text-center border-t ${
            isDarkMode ? "border-neutral-800/80" : "border-neutral-200"
          }`}
        >
          <p
            className={`text-xs font-semibold ${
              isDarkMode ? "text-neutral-500" : "text-neutral-400"
            }`}
          >
            CloudPhotos v1.3 • Build 21 • Made with ❤️ by Diễn Nguyễn
          </p>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;