import React, { useState, useEffect } from "react";
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

  // Bộ nhớ đệm ảnh (Offline Cache)
  const [cacheStats, setCacheStats] = useState<{ count: number; sizeMB: string }>({
    count: 0,
    sizeMB: "0",
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

  useEffect(() => {
    if (isOpen) {
      setFormData(config);
      setPhone(config.phoneNumber || "");
      getCacheStats().then(setCacheStats);
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
      "Xóa bộ nhớ đệm ảnh tạm thời trên iPhone? Dữ liệu ảnh trên Telegram vẫn an toàn 100%."
    );
    if (!confirmed) return;

    await clearPhotoCache();
    resetSyncedDeviceIds();
    setCacheStats({ count: 0, sizeMB: "0" });
    setStatusMsg("Đã dọn dẹp sạch bộ nhớ đệm tạm thời!");
    if (onCacheCleared) onCacheCleared();
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
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div
        className={`w-full max-w-lg rounded-[32px] p-5 sm:p-7 shadow-2xl max-h-[92vh] overflow-y-auto transition-colors duration-200 ${
          isDarkMode
            ? "bg-[#161618] text-white border border-neutral-800"
            : "bg-[#f2f2f7] text-neutral-900 border border-neutral-300"
        }`}
      >
        {/* Header Modal */}
        <div
          className={`flex items-center justify-between pb-4 mb-5 border-b ${
            isDarkMode ? "border-neutral-800" : "border-neutral-200"
          }`}
        >
          <div>
            <h2 className="text-2xl font-black tracking-tight">Cài đặt</h2>
            <p className={`text-xs mt-0.5 ${isDarkMode ? "text-neutral-400" : "text-neutral-500"}`}>
              Quản lý sao lưu & lưu trữ đám mây
            </p>
          </div>
          <button
            onClick={onClose}
            className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors active:scale-95 ${
              isDarkMode
                ? "bg-neutral-800 text-neutral-400 hover:text-white"
                : "bg-neutral-200 text-neutral-600 hover:text-black shadow-sm"
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Thông báo trạng thái nếu có */}
        {statusMsg && (
          <div
            className={`mb-5 p-3.5 rounded-2xl text-xs font-medium flex items-center justify-between animate-in fade-in duration-200 ${
              isDarkMode
                ? "bg-blue-950/60 border border-blue-800/60 text-blue-200"
                : "bg-blue-50 border border-blue-200 text-blue-900 shadow-sm"
            }`}
          >
            <span>{statusMsg}</span>
            <button
              onClick={() => setStatusMsg("")}
              className="text-xs font-bold ml-2 underline"
            >
              Đóng
            </button>
          </div>
        )}

        <div className="space-y-4">
          {/* ======================================================== */}
          {/* THẺ 1: QUẢN LÝ DUNG LƯỢNG (STORAGE & CACHE)              */}
          {/* ======================================================== */}
          <div
            className={`p-5 rounded-3xl border transition-all ${
              isDarkMode
                ? "bg-neutral-900/90 border-neutral-800 shadow-sm"
                : "bg-white border-neutral-200 shadow-md"
            }`}
          >
            <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-400 mb-3 flex items-center gap-2">
              <Database className="w-4 h-4 text-purple-400" />
              Bộ nhớ & Dung lượng
            </h3>

            {/* Mục A: Giải phóng dung lượng iPhone */}
            <div className="space-y-2 mb-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold">Giải phóng dung lượng iPhone</h4>
                  <p className={`text-xs mt-0.5 ${isDarkMode ? "text-neutral-400" : "text-neutral-500"}`}>
                    Xóa ảnh gốc trên máy đã được lưu an toàn trên Telegram
                  </p>
                </div>
                <button
                  type="button"
                  onClick={checkFreeableSpace}
                  disabled={isScanningFreeable}
                  className={`p-2 rounded-xl border text-neutral-400 active:scale-95 transition-transform ${
                    isDarkMode ? "border-neutral-800 bg-neutral-800/50" : "border-neutral-200 bg-neutral-100"
                  }`}
                  title="Quét lại"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isScanningFreeable ? "animate-spin text-purple-400" : ""}`} />
                </button>
              </div>

              <div className={`p-3 rounded-2xl flex items-center justify-between text-xs ${
                isDarkMode ? "bg-neutral-800/40 border border-neutral-800" : "bg-neutral-100/70 border border-neutral-200"
              }`}>
                <span className="text-neutral-400">Có thể dọn dẹp:</span>
                <span className="font-extrabold text-sm text-purple-400">
                  {freeableCount} ảnh an toàn
                </span>
              </div>

              {cleanupMessage && (
                <p className="text-xs text-emerald-400 font-medium px-1">{cleanupMessage}</p>
              )}

              <button
                type="button"
                disabled={freeableCount === 0 || isFreeingUp}
                onClick={handleFreeUpStorage}
                className="w-full py-2.5 px-4 bg-purple-600 hover:bg-purple-500 disabled:opacity-40 disabled:pointer-events-none active:scale-98 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md shadow-purple-600/25 transition-all"
              >
                <Trash2 className="w-3.5 h-3.5" />
                {isFreeingUp ? "Đang xử lý..." : `Dọn dẹp ${freeableCount} ảnh khỏi iPhone`}
              </button>
            </div>

            <div className={`border-t my-3 ${isDarkMode ? "border-neutral-800" : "border-neutral-200"}`} />

            {/* Mục B: Bộ nhớ đệm ảnh (Offline Cache) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold">Bộ nhớ đệm tạm thời (Offline Cache)</h4>
                  <p className={`text-xs mt-0.5 ${isDarkMode ? "text-neutral-400" : "text-neutral-500"}`}>
                    Lưu ảnh tạm trong máy để xem tức thì không cần tải lại
                  </p>
                </div>
              </div>

              <div className={`p-3 rounded-2xl flex items-center justify-between text-xs ${
                isDarkMode ? "bg-neutral-800/40 border border-neutral-800" : "bg-neutral-100/70 border border-neutral-200"
              }`}>
                <span className="text-neutral-400">Đã lưu trong máy:</span>
                <span className="font-extrabold text-sm text-blue-400">
                  {cacheStats.sizeMB} MB • {cacheStats.count} ảnh
                </span>
              </div>

              <button
                type="button"
                onClick={handleClearCache}
                className={`w-full py-2 px-4 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 active:scale-98 transition-all border ${
                  isDarkMode
                    ? "border-red-500/30 bg-red-500/10 hover:bg-red-500/20 text-red-400"
                    : "border-red-300 bg-red-50 hover:bg-red-100 text-red-600"
                }`}
              >
                <Trash2 className="w-3.5 h-3.5" />
                Xóa bộ nhớ đệm ảnh
              </button>
            </div>
          </div>

          {/* ======================================================== */}
          {/* THẺ 3: TÀI KHOẢN & KÊNH TELEGRAM                         */}
          {/* ======================================================== */}
          <div
            className={`p-5 rounded-3xl border transition-all ${
              isDarkMode
                ? "bg-neutral-900/90 border-neutral-800 shadow-sm"
                : "bg-white border-neutral-200 shadow-md"
            }`}
          >
            <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-400 mb-3 flex items-center gap-2">
              <Cloud className="w-4 h-4 text-blue-400" />
              Tài khoản & Kênh Telegram
            </h3>

            {formData.isLoggedIn ? (
              <div className="space-y-3">
                <div className={`p-3.5 rounded-2xl flex items-center justify-between ${
                  isDarkMode ? "bg-neutral-800/40 border border-neutral-800" : "bg-neutral-100/70 border border-neutral-200"
                }`}>
                  <div>
                    <span className="text-[11px] text-neutral-400 block">Số điện thoại kết nối:</span>
                    <span className="text-sm font-bold text-emerald-400">
                      {formData.phoneNumber || phone}
                    </span>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    Đã kết nối MTProto
                  </span>
                </div>

                <div className={`p-3 rounded-2xl text-xs space-y-1 ${
                  isDarkMode ? "bg-neutral-800/20 text-neutral-400" : "bg-neutral-100 text-neutral-600"
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
                  className={`w-full py-2.5 px-4 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 active:scale-98 transition-all border cursor-pointer ${
                    isDarkMode
                      ? "border-neutral-800 bg-neutral-900/60 hover:bg-neutral-800 text-neutral-300"
                      : "border-neutral-200 bg-neutral-100 hover:bg-neutral-200 text-neutral-700"
                  }`}
                >
                  <RefreshCw className="w-3.5 h-3.5 text-blue-400" />
                  Làm mới danh sách ảnh từ Telegram
                </button>

                <button
                  type="button"
                  onClick={handleLogout}
                  className={`w-full py-2.5 px-4 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 active:scale-98 transition-all border ${
                    isDarkMode
                      ? "border-neutral-800 bg-neutral-800 hover:bg-neutral-700 text-neutral-300"
                      : "border-neutral-300 bg-neutral-200 hover:bg-neutral-300 text-neutral-700"
                  }`}
                >
                  <LogOut className="w-3.5 h-3.5 text-red-400" />
                  Đăng xuất tài khoản Telegram
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-xs text-amber-300 space-y-1">
                  <p className="font-bold flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 shrink-0" />
                    Chưa kết nối tài khoản Telegram
                  </p>
                  <p className="text-[11px] opacity-90">
                    Vui lòng nhập số điện thoại để nhận mã xác thực Telegram và lưu ảnh vào Kênh riêng tư.
                  </p>
                </div>

                {step === "phone" && (
                  <div className="space-y-2.5">
                    <label className="text-xs font-semibold block text-neutral-400">
                      Số điện thoại quốc tế (ví dụ: +84...)
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-neutral-400 absolute left-3.5 top-3" />
                      <input
                        type="tel"
                        placeholder="+84399962032"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className={`w-full pl-10 pr-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
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
                      className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold rounded-xl text-xs active:scale-98 transition-all"
                    >
                      {loading ? "Đang gửi mã..." : "Gửi mã xác thực OTP"}
                    </button>
                  </div>
                )}

                {step === "code" && (
                  <div className="space-y-2.5">
                    <label className="text-xs font-semibold block text-neutral-400">
                      Nhập mã xác thực Telegram (gửi qua app Telegram)
                    </label>
                    <input
                      type="text"
                      placeholder="12345"
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      className={`w-full px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        isDarkMode
                          ? "bg-neutral-800 border border-neutral-700 text-white"
                          : "bg-white border border-neutral-300 text-black"
                      }`}
                    />
                    <button
                      type="button"
                      disabled={loading}
                      onClick={handleVerifyCode}
                      className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold rounded-xl text-xs active:scale-98 transition-all"
                    >
                      {loading ? "Đang xác thực..." : "Xác nhận đăng nhập"}
                    </button>
                  </div>
                )}

                {step === "password" && (
                  <div className="space-y-2.5">
                    <label className="text-xs font-semibold block text-neutral-400">
                      Mật khẩu xác thực 2 lớp (2FA Password)
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-neutral-400 absolute left-3.5 top-3" />
                      <input
                        type="password"
                        placeholder="Mật khẩu Telegram của bạn"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className={`w-full pl-10 pr-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
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
                      className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold rounded-xl text-xs active:scale-98 transition-all"
                    >
                      {loading ? "Đang xác thực..." : "Đăng nhập với mật khẩu 2FA"}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Toggle hiển thị thông số API ID & Hash cho nhà phát triển */}
            <div className="mt-3 pt-3 border-t border-neutral-800/50">
              <button
                type="button"
                onClick={() => setShowDeveloperApi(!showDeveloperApi)}
                className="w-full text-xs font-semibold text-neutral-400 hover:text-white flex items-center justify-between py-1 transition-colors"
              >
                <span>Tùy chỉnh API ID & API Hash (Developer)</span>
                {showDeveloperApi ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>

              {showDeveloperApi && (
                <form onSubmit={handleSaveApiCredentials} className="mt-2.5 space-y-2.5 animate-in fade-in duration-200">
                  <div>
                    <label className="text-[11px] font-medium text-neutral-400 block mb-1">
                      API ID (từ my.telegram.org)
                    </label>
                    <input
                      type="text"
                      value={formData.apiId}
                      onChange={(e) => setFormData({ ...formData, apiId: e.target.value })}
                      placeholder="Ví dụ: 38786968"
                      className={`w-full px-3 py-2 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        isDarkMode
                          ? "bg-neutral-800 border border-neutral-700 text-white"
                          : "bg-white border border-neutral-300 text-black"
                      }`}
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-neutral-400 block mb-1">
                      API Hash
                    </label>
                    <input
                      type="text"
                      value={formData.apiHash}
                      onChange={(e) => setFormData({ ...formData, apiHash: e.target.value })}
                      placeholder="Ví dụ: 994a3e..."
                      className={`w-full px-3 py-2 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        isDarkMode
                          ? "bg-neutral-800 border border-neutral-700 text-white"
                          : "bg-white border border-neutral-300 text-black"
                      }`}
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full py-2 bg-neutral-700 hover:bg-neutral-600 text-white font-semibold rounded-xl text-xs transition-colors"
                  >
                    Lưu thông số API
                  </button>
                </form>
              )}
            </div>
          </div>

          {/* ======================================================== */}
          {/* THẺ 4: CHẾ ĐỘ GIAO DIỆN (THEME SELECTOR)                 */}
          {/* ======================================================== */}
          <div
            className={`p-5 rounded-3xl border transition-all ${
              isDarkMode
                ? "bg-neutral-900/90 border-neutral-800 shadow-sm"
                : "bg-white border-neutral-200 shadow-md"
            }`}
          >
            <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-400 mb-3 flex items-center gap-2">
              <Sun className="w-4 h-4 text-amber-400" />
              Chế độ giao diện (Theme)
            </h3>

            <div className={`p-1.5 rounded-2xl grid grid-cols-3 gap-1.5 ${
              isDarkMode ? "bg-neutral-800/60" : "bg-neutral-100"
            }`}>
              <button
                type="button"
                onClick={() => onThemeChange("dark")}
                className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
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
                className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
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
                className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
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
          {/* THẺ 5: THÔNG TIN ỨNG DỤNG & TÁC GIẢ                     */}
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
                <h4 className="text-sm font-bold">Diễn Nguyễn</h4>
                <p className="text-[11px] text-neutral-400">Tác giả phát triển ứng dụng</p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-400 border border-blue-500/25 block">
                Build 20
              </span>
              <span className="text-[10px] text-neutral-500 block mt-0.5">iOS Native</span>
            </div>
          </div>
        </div>

        {/* Footer Modal */}
        <div
          className={`mt-6 pt-3 text-center border-t ${
            isDarkMode ? "border-neutral-800/80" : "border-neutral-200"
          }`}
        >
          <p
            className={`text-[11px] font-medium ${
              isDarkMode ? "text-neutral-500" : "text-neutral-400"
            }`}
          >
            CloudPhotos v1.3 • Build 20 • Made with ❤️ by Diễn Nguyễn
          </p>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
