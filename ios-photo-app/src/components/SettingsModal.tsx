import React, { useState, useEffect } from "react";
import type { TelegramConfig, ThemeMode } from "../types";
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
  Moon,
  Sun,
  Laptop,
  Cloud,
  ChevronRight,
  ChevronDown,
  Wifi,
} from "lucide-react";
import {
  requestTelegramCode,
  verifyTelegramCode,
  logoutTelegram,
} from "../services/telegramClient";
import { getCacheStats, clearPhotoCache } from "../services/photoStorage";
import {
  openNativeSettings,
  presentLimitedLibraryPicker,
  getFreeableDevicePhotos,
  freeUpDeviceStorage,
  getSyncedDeviceIds,
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
  autoSync: boolean;
  onAutoSyncChange: (enabled: boolean) => void;
  onTriggerSyncNow?: () => void;
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
  autoSync,
  onAutoSyncChange,
  onTriggerSyncNow,
}) => {
  const [formData, setFormData] = useState<TelegramConfig>(config);
  // Chỉ mở mục khi người dùng bấm vào (Accordion/Drilldown)
  const [activeSection, setActiveSection] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<"api" | "login">(
    config.apiId && config.apiHash && !config.isLoggedIn ? "login" : "api"
  );
  const [phone, setPhone] = useState(config.phoneNumber || "");
  const [phoneCodeHash, setPhoneCodeHash] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [step, setStep] = useState<"phone" | "code" | "password">("phone");
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [cacheStats, setCacheStats] = useState<{ count: number; sizeMB: string }>({
    count: 0,
    sizeMB: "0",
  });

  // Giải phóng dung lượng iPhone (Free Up Space)
  const [freeableCount, setFreeableCount] = useState<number>(0);
  const [syncedTotalCount, setSyncedTotalCount] = useState<number>(0);
  const [isScanningFreeable, setIsScanningFreeable] = useState(false);
  const [isFreeingUp, setIsFreeingUp] = useState(false);
  const [cleanupMessage, setCleanupMessage] = useState<string | null>(null);

  const checkFreeableSpace = async () => {
    setIsScanningFreeable(true);
    try {
      const synced = getSyncedDeviceIds();
      setSyncedTotalCount(synced.size);
      const freeable = await getFreeableDevicePhotos();
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
    }
  }, [isOpen, config]);

  const handleFreeUpStorage = async () => {
    if (freeableCount === 0) return;
    const confirmed = window.confirm(
      `Bạn có chắc chắn muốn xóa ${freeableCount} ảnh đã sao lưu khỏi Thư viện ảnh iPhone để giải phóng dung lượng?\n\n(Ảnh vẫn được lưu an toàn 100% trên Telegram. iPhone sẽ chuyển ảnh vào mục "Đã xóa gần đây")`
    );
    if (!confirmed) return;

    setIsFreeingUp(true);
    setCleanupMessage("Đang yêu cầu iOS xóa ảnh khỏi thiết bị...");
    try {
      const res = await freeUpDeviceStorage();
      setCleanupMessage(res.message);
      await checkFreeableSpace();
    } catch (err: any) {
      setCleanupMessage("Lỗi: " + (err.message || String(err)));
    } finally {
      setIsFreeingUp(false);
    }
  };

  const toggleSection = (sectionName: string) => {
    setActiveSection((prev) => (prev === sectionName ? null : sectionName));
  };

  const handleClearCache = async () => {
    await clearPhotoCache();
    setCacheStats({ count: 0, sizeMB: "0" });
    setStatusMsg("Đã dọn dẹp sạch bộ nhớ đệm ảnh!");
    if (onCacheCleared) onCacheCleared();
  };

  if (!isOpen) return null;

  const handleSendCode = async () => {
    if (!formData.apiId || !formData.apiHash) {
      setStatusMsg("Vui lòng nhập API ID và API Hash trước");
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
      setStatusMsg("Đăng nhập Telegram MTProto thành công!");
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
    await logoutTelegram();
    const updatedConfig: TelegramConfig = {
      ...formData,
      sessionString: "",
      isLoggedIn: false,
    };
    setFormData(updatedConfig);
    onSave(updatedConfig);
    setStatusMsg("Đã đăng xuất tài khoản.");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    setSavedSuccess(true);
    if (!formData.isLoggedIn && formData.apiId && formData.apiHash) {
      setTimeout(() => {
        setSavedSuccess(false);
        setActiveTab("login");
        setStatusMsg("Đã lưu API ID & Hash! Tiếp theo hãy nhập SĐT để nhận mã OTP.");
      }, 500);
    } else {
      setTimeout(() => {
        setSavedSuccess(false);
      }, 1000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div
        className={`w-full max-w-lg rounded-3xl p-5 sm:p-6 shadow-2xl max-h-[92vh] overflow-y-auto transition-colors duration-200 ${
          isDarkMode
            ? "bg-[#1c1c1e] text-white border border-neutral-800"
            : "bg-[#f2f2f7] text-neutral-900 border border-neutral-300"
        }`}
      >
        {/* Modal Header */}
        <div
          className={`flex items-center justify-between pb-3 mb-4 border-b ${
            isDarkMode ? "border-neutral-800" : "border-neutral-300"
          }`}
        >
          <div>
            <h2 className="text-xl font-bold tracking-tight">Cài đặt</h2>
            <p className="text-xs text-neutral-400 mt-0.5">
              Chạm vào từng mục để xem và tùy chỉnh
            </p>
          </div>
          <button
            onClick={onClose}
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors active:scale-95 ${
              isDarkMode
                ? "bg-neutral-800 text-neutral-400 hover:text-white"
                : "bg-neutral-200 text-neutral-600 hover:text-black"
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {statusMsg && (
          <div
            className={`mb-4 p-3 rounded-2xl text-xs flex items-center justify-between animate-in fade-in duration-200 ${
              isDarkMode
                ? "bg-blue-950/60 border border-blue-800/60 text-blue-200"
                : "bg-blue-50 border border-blue-200 text-blue-900"
            }`}
          >
            <span>{statusMsg}</span>
            <button
              onClick={() => setStatusMsg("")}
              className="text-xs font-semibold ml-2 underline"
            >
              Đóng
            </button>
          </div>
        )}

        {/* DANH SÁCH CÁC MỤC CÀI ĐẶT DẠNG ACCORDION THU GỌN CHUẨN APPLE IOS */}
        <div className="space-y-3">
          {/* MỤC 1: ĐỒNG BỘ & SAO LƯU TỰ ĐỘNG (GOOGLE PHOTOS STYLE) */}
          <div
            className={`rounded-2xl border transition-all overflow-hidden ${
              isDarkMode
                ? "bg-neutral-900/90 border-neutral-800"
                : "bg-white border-neutral-200 shadow-sm"
            }`}
          >
            <div
              onClick={() => toggleSection("sync")}
              className="p-4 flex items-center justify-between cursor-pointer active:opacity-80 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-500 flex items-center justify-center shrink-0">
                  <RefreshCw className={`w-5 h-5 ${autoSync ? "text-emerald-500" : "text-neutral-400"}`} />
                </div>
                <div>
                  <div className="text-sm font-bold flex items-center gap-2">
                    <span>Sao lưu & Đồng bộ tự động</span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                        autoSync
                          ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                          : "bg-neutral-500/20 text-neutral-400"
                      }`}
                    >
                      {autoSync ? "Đang bật" : "Đã tắt"}
                    </span>
                  </div>
                  <p
                    className={`text-xs mt-0.5 ${
                      isDarkMode ? "text-neutral-400" : "text-neutral-500"
                    }`}
                  >
                    Tự động sao lưu ảnh Camera Roll lên Telegram
                  </p>
                </div>
              </div>

              {activeSection === "sync" ? (
                <ChevronDown className="w-5 h-5 text-neutral-400" />
              ) : (
                <ChevronRight className="w-5 h-5 text-neutral-400" />
              )}
            </div>

            {/* Chi tiết mục Đồng bộ khi bấm vào */}
            {activeSection === "sync" && (
              <div
                className={`p-4 border-t space-y-3.5 animate-in fade-in duration-200 ${
                  isDarkMode ? "border-neutral-800 bg-neutral-950/40" : "border-neutral-100 bg-neutral-50/60"
                }`}
              >
                {/* Switch Bật/Tắt */}
                <div className="flex items-center justify-between">
                  <div>
                    <h5 className="text-sm font-semibold">Tự động sao lưu trong nền</h5>
                    <p
                      className={`text-xs mt-0.5 ${
                        isDarkMode ? "text-neutral-400" : "text-neutral-500"
                      }`}
                    >
                      Tương tự Google Photos, tự động tải ảnh mới lên Kênh
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => onAutoSyncChange(!autoSync)}
                    className={`w-12 h-7 rounded-full p-1 transition-colors duration-200 ease-in-out relative ${
                      autoSync ? "bg-emerald-500" : isDarkMode ? "bg-neutral-700" : "bg-neutral-300"
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform duration-200 ease-in-out ${
                        autoSync ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>

                {autoSync && (
                  <div className="space-y-2.5 pt-2 border-t border-neutral-800/40">
                    <div className="flex items-center gap-2 text-xs text-neutral-400">
                      <Wifi className="w-4 h-4 text-blue-400 shrink-0" />
                      <span>Sao lưu tự động nền khi mở ứng dụng</span>
                    </div>

                    {/* Hướng dẫn và phím tắt cấp quyền Thư viện ảnh trên iPhone */}
                    <div className="p-3 bg-amber-500/10 border border-amber-500/25 rounded-xl space-y-2 text-xs">
                      <div className="flex items-center gap-2 font-bold text-amber-400">
                        <ShieldCheck className="w-4 h-4 shrink-0" />
                        <span>Quyền truy cập Ảnh trên iPhone:</span>
                      </div>
                      <p className={`text-[11px] leading-relaxed ${isDarkMode ? "text-neutral-300" : "text-neutral-600"}`}>
                        Để tự động sao lưu tất cả ảnh trong máy (Google Photos style), bạn cần chọn <strong>"Tất cả ảnh"</strong> trong Cài đặt iPhone.
                      </p>
                      <div className="flex gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => openNativeSettings()}
                          className="flex-1 py-1.5 px-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-[11px] flex items-center justify-center gap-1 active:scale-95 transition-transform shadow"
                        >
                          <ExternalLink className="w-3 h-3" />
                          Mở Cài đặt iPhone
                        </button>
                        <button
                          type="button"
                          onClick={() => presentLimitedLibraryPicker()}
                          className={`py-1.5 px-2.5 font-semibold rounded-lg text-[11px] flex items-center justify-center gap-1 active:scale-95 transition-transform ${
                            isDarkMode ? "bg-neutral-800 hover:bg-neutral-700 text-neutral-200" : "bg-neutral-200 hover:bg-neutral-300 text-neutral-800"
                          }`}
                        >
                          Chọn thêm ảnh
                        </button>
                      </div>
                    </div>

                    {onTriggerSyncNow && (
                      <button
                        type="button"
                        onClick={onTriggerSyncNow}
                        className="w-full mt-2 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-xs flex items-center justify-center gap-1.5 active:scale-98 transition-transform shadow-md"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        Quét & Đồng bộ ảnh ngay bây giờ
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* MỤC 2: GIẢI PHÓNG DUNG LƯỢNG IPHONE (FREE UP SPACE) */}
          <div
            className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
              isDarkMode
                ? "bg-neutral-900/60 border-neutral-800"
                : "bg-white border-neutral-200 shadow-sm"
            }`}
          >
            <div
              onClick={() => toggleSection("cleanup")}
              className="p-4 flex items-center justify-between cursor-pointer select-none"
            >
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-purple-500/15 text-purple-400">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-semibold">Giải phóng dung lượng iPhone</h4>
                    {freeableCount > 0 && (
                      <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                        {freeableCount} ảnh
                      </span>
                    )}
                  </div>
                  <p
                    className={`text-xs mt-0.5 ${
                      isDarkMode ? "text-neutral-400" : "text-neutral-500"
                    }`}
                  >
                    Xóa ảnh gốc trên máy đã được sao lưu an toàn lên Telegram
                  </p>
                </div>
              </div>

              {activeSection === "cleanup" ? (
                <ChevronDown className="w-5 h-5 text-neutral-400" />
              ) : (
                <ChevronRight className="w-5 h-5 text-neutral-400" />
              )}
            </div>

            {/* Chi tiết mục Giải phóng dung lượng khi bấm vào */}
            {activeSection === "cleanup" && (
              <div
                className={`p-4 border-t space-y-3.5 animate-in fade-in duration-200 ${
                  isDarkMode ? "border-neutral-800 bg-neutral-950/40" : "border-neutral-100 bg-neutral-50/60"
                }`}
              >
                <div
                  className={`p-3 rounded-xl text-xs leading-relaxed ${
                    isDarkMode
                      ? "bg-neutral-800/60 text-neutral-300 border border-neutral-800"
                      : "bg-white text-neutral-700 border border-neutral-200"
                  }`}
                >
                  <p>
                    🧹 <strong>Tương tự Google Photos:</strong> Tính năng này kiểm tra các ảnh trong máy của bạn đã được tải lên Kênh Telegram thành công, sau đó kích hoạt xác nhận của iOS để xóa ảnh khỏi iPhone nhằm tiết kiệm bộ nhớ máy (ảnh sẽ nằm trong mục <em>Đã xóa gần đây</em> của iPhone trong 30 ngày).
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div
                    className={`p-2.5 rounded-xl border ${
                      isDarkMode
                        ? "bg-neutral-800/40 border-neutral-800"
                        : "bg-white border-neutral-200"
                    }`}
                  >
                    <span className="text-[11px] block text-neutral-500">Đã sao lưu lên Telegram:</span>
                    <span className="font-semibold text-sm text-blue-400">{syncedTotalCount} ảnh</span>
                  </div>
                  <div
                    className={`p-2.5 rounded-xl border ${
                      isDarkMode
                        ? "bg-neutral-800/40 border-neutral-800"
                        : "bg-white border-neutral-200"
                    }`}
                  >
                    <span className="text-[11px] block text-neutral-500">Có thể dọn dẹp trên iPhone:</span>
                    <span className="font-semibold text-sm text-purple-400">{freeableCount} ảnh</span>
                  </div>
                </div>

                {cleanupMessage && (
                  <div className="p-2.5 rounded-xl text-xs bg-purple-500/15 border border-purple-500/30 text-purple-300 font-medium">
                    {cleanupMessage}
                  </div>
                )}

                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleFreeUpStorage}
                    disabled={isFreeingUp || freeableCount === 0}
                    className={`flex-1 py-2.5 font-semibold rounded-xl text-xs flex items-center justify-center gap-1.5 active:scale-98 transition-transform shadow-md ${
                      freeableCount > 0
                        ? "bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white"
                        : isDarkMode
                        ? "bg-neutral-800 text-neutral-500 cursor-not-allowed"
                        : "bg-neutral-200 text-neutral-400 cursor-not-allowed"
                    }`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    {isFreeingUp
                      ? "Đang giải phóng dung lượng..."
                      : freeableCount > 0
                      ? `Xóa ${freeableCount} ảnh khỏi iPhone để giải phóng`
                      : "Không có ảnh nào cần giải phóng"}
                  </button>

                  <button
                    type="button"
                    onClick={checkFreeableSpace}
                    disabled={isScanningFreeable}
                    className={`px-3 py-2.5 rounded-xl text-xs font-medium border flex items-center justify-center transition-colors ${
                      isDarkMode
                        ? "bg-neutral-800 hover:bg-neutral-700 border-neutral-700 text-neutral-300"
                        : "bg-white hover:bg-neutral-100 border-neutral-200 text-neutral-700"
                    }`}
                    title="Quét lại bộ nhớ iPhone"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isScanningFreeable ? "animate-spin" : ""}`} />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* MỤC 3: TÀI KHOẢN & KÊNH TELEGRAM MTPROTO */}
          <div
            className={`rounded-2xl border transition-all overflow-hidden ${
              isDarkMode
                ? "bg-neutral-900/90 border-neutral-800"
                : "bg-white border-neutral-200 shadow-sm"
            }`}
          >
            <div
              onClick={() => toggleSection("telegram")}
              className="p-4 flex items-center justify-between cursor-pointer active:opacity-80 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-500 flex items-center justify-center shrink-0">
                  <Cloud className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm font-bold flex items-center gap-2">
                    <span>Tài khoản & Kênh Telegram</span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                        formData.isLoggedIn
                          ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                          : "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                      }`}
                    >
                      {formData.isLoggedIn ? "Đã kết nối" : "Chưa đăng nhập"}
                    </span>
                  </div>
                  <p
                    className={`text-xs mt-0.5 ${
                      isDarkMode ? "text-neutral-400" : "text-neutral-500"
                    }`}
                  >
                    {formData.phoneNumber
                      ? `SĐT: ${formData.phoneNumber}`
                      : "Kết nối kênh riêng tư không giới hạn"}
                  </p>
                </div>
              </div>

              {activeSection === "telegram" ? (
                <ChevronDown className="w-5 h-5 text-neutral-400" />
              ) : (
                <ChevronRight className="w-5 h-5 text-neutral-400" />
              )}
            </div>

            {/* Chi tiết mục Telegram khi bấm vào */}
            {activeSection === "telegram" && (
              <div
                className={`p-4 border-t space-y-4 animate-in fade-in duration-200 ${
                  isDarkMode ? "border-neutral-800 bg-neutral-950/40" : "border-neutral-100 bg-neutral-50/60"
                }`}
              >
                {/* Switch tab API vs Login */}
                <div
                  className={`flex p-1 rounded-xl ${
                    isDarkMode ? "bg-neutral-800/80" : "bg-neutral-200/80"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setActiveTab("api")}
                    className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                      activeTab === "api"
                        ? isDarkMode
                          ? "bg-neutral-700 text-white shadow-sm"
                          : "bg-white text-black shadow-sm"
                        : isDarkMode
                        ? "text-neutral-400"
                        : "text-neutral-600"
                    }`}
                  >
                    Thông số API
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("login")}
                    className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                      activeTab === "login"
                        ? isDarkMode
                          ? "bg-neutral-700 text-white shadow-sm"
                          : "bg-white text-black shadow-sm"
                        : isDarkMode
                        ? "text-neutral-400"
                        : "text-neutral-600"
                    }`}
                  >
                    Đăng nhập MTProto
                  </button>
                </div>

                {activeTab === "api" && (
                  <form onSubmit={handleSubmit} className="space-y-3">
                    <p className="text-xs text-neutral-400 leading-relaxed">
                      Lấy <b>API ID</b> & <b>API Hash</b> miễn phí tại:{" "}
                      <a
                        href="https://my.telegram.org/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-500 underline inline-flex items-center gap-0.5 font-medium"
                      >
                        my.telegram.org <ExternalLink className="w-3 h-3" />
                      </a>
                    </p>

                    <div>
                      <label className="text-xs font-medium flex items-center gap-1.5 mb-1 text-neutral-300">
                        <Key className="w-3.5 h-3.5 text-blue-500" />
                        API ID:
                      </label>
                      <input
                        type="text"
                        placeholder="Ví dụ: 28471923"
                        value={formData.apiId}
                        onChange={(e) =>
                          setFormData({ ...formData, apiId: e.target.value.trim() })
                        }
                        className={`w-full rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          isDarkMode
                            ? "bg-neutral-800 border border-neutral-700 text-white"
                            : "bg-white border border-neutral-300 text-black"
                        }`}
                      />
                    </div>

                    <div>
                      <label className="text-xs font-medium flex items-center gap-1.5 mb-1 text-neutral-300">
                        <ShieldCheck className="w-3.5 h-3.5 text-blue-500" />
                        API HASH:
                      </label>
                      <input
                        type="text"
                        placeholder="Chuỗi hash 32 ký tự..."
                        value={formData.apiHash}
                        onChange={(e) =>
                          setFormData({ ...formData, apiHash: e.target.value.trim() })
                        }
                        className={`w-full rounded-xl px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          isDarkMode
                            ? "bg-neutral-800 border border-neutral-700 text-white"
                            : "bg-white border border-neutral-300 text-black"
                        }`}
                      />
                    </div>

                    <div>
                      <label className="text-xs font-medium flex items-center gap-1.5 mb-1 text-neutral-300">
                        <Hash className="w-3.5 h-3.5 text-blue-500" />
                        ID Kênh lưu trữ (Tự động tìm nếu để trống):
                      </label>
                      <input
                        type="text"
                        placeholder="Tự động tìm Kênh 'Kho ảnh đồng bộ Telegram'..."
                        value={formData.channelId}
                        onChange={(e) =>
                          setFormData({ ...formData, channelId: e.target.value.trim() })
                        }
                        className={`w-full rounded-xl px-3 py-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          isDarkMode
                            ? "bg-neutral-800 border border-neutral-700 text-white"
                            : "bg-white border border-neutral-300 text-black"
                        }`}
                      />
                    </div>

                    <div className="pt-1">
                      <button
                        type="submit"
                        className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-xs flex items-center justify-center gap-1.5 active:scale-98 transition-transform"
                      >
                        {savedSuccess ? (
                          <>
                            <Check className="w-4 h-4" />
                            Đã lưu cấu hình!
                          </>
                        ) : (
                          "Lưu cấu hình API"
                        )}
                      </button>
                    </div>
                  </form>
                )}

                {activeTab === "login" && (
                  <div className="space-y-3">
                    {formData.isLoggedIn ? (
                      <div
                        className={`p-4 rounded-2xl text-center border ${
                          isDarkMode
                            ? "bg-emerald-950/40 border-emerald-800/60"
                            : "bg-emerald-50 border-emerald-200"
                        }`}
                      >
                        <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center mx-auto mb-2">
                          <Check className="w-5 h-5" />
                        </div>
                        <h4 className="font-semibold text-emerald-500 text-sm">
                          Đã kết nối Telegram cá nhân
                        </h4>
                        <p className="text-xs text-neutral-400 mt-1">
                          Tài khoản: <b>{formData.phoneNumber}</b>
                        </p>
                        <button
                          type="button"
                          onClick={handleLogout}
                          className="mt-3 px-3.5 py-1.5 bg-red-600/10 text-red-500 border border-red-500/30 rounded-xl text-xs font-semibold flex items-center gap-1.5 mx-auto active:scale-95 transition-transform"
                        >
                          <LogOut className="w-3.5 h-3.5" />
                          Đăng xuất tài khoản
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {step === "phone" && (
                          <div>
                            <label className="text-xs font-medium flex items-center gap-1.5 mb-1 text-neutral-300">
                              <Phone className="w-3.5 h-3.5 text-blue-500" />
                              Số điện thoại Telegram:
                            </label>
                            <input
                              type="text"
                              placeholder="+84xxxxxxxxx"
                              value={phone}
                              onChange={(e) => setPhone(e.target.value)}
                              className={`w-full rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                isDarkMode
                                  ? "bg-neutral-800 border border-neutral-700 text-white"
                                  : "bg-white border border-neutral-300 text-black"
                              }`}
                            />
                            <button
                              type="button"
                              disabled={loading}
                              onClick={handleSendCode}
                              className="w-full mt-2.5 py-2.5 bg-blue-600 text-white font-semibold rounded-xl text-xs flex items-center justify-center gap-1.5 active:bg-blue-700 disabled:opacity-50"
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
                          <div>
                            <label className="text-xs font-medium flex items-center gap-1.5 mb-1 text-neutral-300">
                              <Lock className="w-3.5 h-3.5 text-blue-500" />
                              Nhập mã xác thực đã nhận:
                            </label>
                            <input
                              type="text"
                              placeholder="12345"
                              value={code}
                              onChange={(e) => setCode(e.target.value)}
                              className={`w-full rounded-xl px-3 py-2 text-sm font-mono tracking-widest text-center focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                isDarkMode
                                  ? "bg-neutral-800 border border-neutral-700 text-white"
                                  : "bg-white border border-neutral-300 text-black"
                              }`}
                            />
                            <button
                              type="button"
                              disabled={loading}
                              onClick={handleVerifyCode}
                              className="w-full mt-2.5 py-2.5 bg-emerald-600 text-white font-semibold rounded-xl text-xs flex items-center justify-center gap-1.5 active:bg-emerald-700 disabled:opacity-50"
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
                          <div>
                            <label className="text-xs font-medium flex items-center gap-1.5 mb-1 text-neutral-300">
                              <Lock className="w-3.5 h-3.5 text-purple-500" />
                              Mật khẩu 2FA (Xác thực 2 bước):
                            </label>
                            <input
                              type="password"
                              placeholder="Nhập mật khẩu 2FA..."
                              value={password}
                              onChange={(e) => setPassword(e.target.value)}
                              className={`w-full rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                                isDarkMode
                                  ? "bg-neutral-800 border border-neutral-700 text-white"
                                  : "bg-white border border-neutral-300 text-black"
                              }`}
                            />
                            <button
                              type="button"
                              disabled={loading}
                              onClick={handleVerifyCode}
                              className="w-full mt-2.5 py-2.5 bg-purple-600 text-white font-semibold rounded-xl text-xs flex items-center justify-center gap-1.5 active:bg-purple-700 disabled:opacity-50"
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
              </div>
            )}
          </div>

          {/* MỤC 3: BỘ NHỚ ĐỆM ẢNH (OFFLINE CACHE) */}
          <div
            className={`rounded-2xl border transition-all overflow-hidden ${
              isDarkMode
                ? "bg-neutral-900/90 border-neutral-800"
                : "bg-white border-neutral-200 shadow-sm"
            }`}
          >
            <div
              onClick={() => toggleSection("cache")}
              className="p-4 flex items-center justify-between cursor-pointer active:opacity-80 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-500 flex items-center justify-center shrink-0">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm font-bold flex items-center gap-2">
                    <span>Bộ nhớ đệm ảnh (Offline Cache)</span>
                  </div>
                  <p
                    className={`text-xs mt-0.5 ${
                      isDarkMode ? "text-neutral-400" : "text-neutral-500"
                    }`}
                  >
                    {cacheStats.count > 0
                      ? `${cacheStats.sizeMB} MB • ${cacheStats.count} ảnh trong máy`
                      : "Chưa có ảnh lưu trong bộ nhớ máy"}
                  </p>
                </div>
              </div>

              {activeSection === "cache" ? (
                <ChevronDown className="w-5 h-5 text-neutral-400" />
              ) : (
                <ChevronRight className="w-5 h-5 text-neutral-400" />
              )}
            </div>

            {/* Chi tiết mục Cache khi bấm vào */}
            {activeSection === "cache" && (
              <div
                className={`p-4 border-t space-y-3 animate-in fade-in duration-200 ${
                  isDarkMode ? "border-neutral-800 bg-neutral-950/40" : "border-neutral-100 bg-neutral-50/60"
                }`}
              >
                <p className="text-xs text-neutral-400 leading-relaxed">
                  Toàn bộ ảnh thumbnail và HD đã xem được lưu trong <b>IndexedDB</b> trên iPhone của bạn. Giúp bạn mở ứng dụng thấy ngay toàn bộ ảnh tức thì mà không cần mạng.
                </p>

                {cacheStats.count > 0 ? (
                  <button
                    type="button"
                    onClick={handleClearCache}
                    className="w-full py-2.5 px-3 text-xs font-semibold text-red-500 bg-red-500/10 border border-red-500/25 rounded-xl active:scale-98 transition-transform flex items-center justify-center gap-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Xóa sạch {cacheStats.sizeMB} MB bộ nhớ đệm
                  </button>
                ) : (
                  <div className="text-xs text-neutral-500 italic text-center py-1">
                    Bộ nhớ đệm hiện đang trống.
                  </div>
                )}
              </div>
            )}
          </div>

          {/* MỤC 4: GIAO DIỆN & CHỦ ĐỀ (THEME) */}
          <div
            className={`rounded-2xl border transition-all overflow-hidden ${
              isDarkMode
                ? "bg-neutral-900/90 border-neutral-800"
                : "bg-white border-neutral-200 shadow-sm"
            }`}
          >
            <div
              onClick={() => toggleSection("theme")}
              className="p-4 flex items-center justify-between cursor-pointer active:opacity-80 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-500 flex items-center justify-center shrink-0">
                  {theme === "dark" ? (
                    <Moon className="w-5 h-5" />
                  ) : theme === "light" ? (
                    <Sun className="w-5 h-5" />
                  ) : (
                    <Laptop className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <div className="text-sm font-bold flex items-center gap-2">
                    <span>Chế độ giao diện (Theme)</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-neutral-500/20 text-neutral-400">
                      {theme === "dark" ? "Tối" : theme === "light" ? "Sáng" : "Tự động"}
                    </span>
                  </div>
                  <p
                    className={`text-xs mt-0.5 ${
                      isDarkMode ? "text-neutral-400" : "text-neutral-500"
                    }`}
                  >
                    Chuyển đổi giao diện Sáng / Tối
                  </p>
                </div>
              </div>

              {activeSection === "theme" ? (
                <ChevronDown className="w-5 h-5 text-neutral-400" />
              ) : (
                <ChevronRight className="w-5 h-5 text-neutral-400" />
              )}
            </div>

            {/* Chi tiết chọn theme khi bấm vào */}
            {activeSection === "theme" && (
              <div
                className={`p-4 border-t space-y-3 animate-in fade-in duration-200 ${
                  isDarkMode ? "border-neutral-800 bg-neutral-950/40" : "border-neutral-100 bg-neutral-50/60"
                }`}
              >
                <div
                  className={`grid grid-cols-3 gap-1.5 p-1 rounded-xl ${
                    isDarkMode ? "bg-neutral-800/80" : "bg-neutral-200/80"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => onThemeChange("dark")}
                    className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                      theme === "dark"
                        ? isDarkMode
                          ? "bg-neutral-700 text-white shadow-sm"
                          : "bg-white text-black shadow-sm"
                        : isDarkMode
                        ? "text-neutral-400"
                        : "text-neutral-600"
                    }`}
                  >
                    <Moon className="w-3.5 h-3.5 text-blue-400" />
                    <span>Tối (Dark)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onThemeChange("light")}
                    className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                      theme === "light"
                        ? isDarkMode
                          ? "bg-neutral-700 text-white shadow-sm"
                          : "bg-white text-black shadow-sm"
                        : isDarkMode
                        ? "text-neutral-400"
                        : "text-neutral-600"
                    }`}
                  >
                    <Sun className="w-3.5 h-3.5 text-amber-400" />
                    <span>Sáng (Light)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onThemeChange("system")}
                    className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                      theme === "system"
                        ? isDarkMode
                          ? "bg-neutral-700 text-white shadow-sm"
                          : "bg-white text-black shadow-sm"
                        : isDarkMode
                        ? "text-neutral-400"
                        : "text-neutral-600"
                    }`}
                  >
                    <Laptop className="w-3.5 h-3.5 text-purple-400" />
                    <span>Tự động</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* MỤC 5: THÔNG TIN ỨNG DỤNG & NHÀ PHÁT TRIỂN (DIỄN NGUYỄN) */}
          <div
            className={`rounded-2xl border transition-all overflow-hidden ${
              isDarkMode
                ? "bg-neutral-900/90 border-neutral-800"
                : "bg-white border-neutral-200 shadow-sm"
            }`}
          >
            <div
              onClick={() => toggleSection("about")}
              className="p-4 flex items-center justify-between cursor-pointer active:opacity-80 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-500 to-pink-500 text-white flex items-center justify-center shrink-0 shadow-md font-bold text-sm">
                  DN
                </div>
                <div>
                  <div className="text-sm font-bold flex items-center gap-2">
                    <span>Tác giả: Diễn Nguyễn</span>
                    <span className="text-[10px] font-semibold bg-blue-500/20 text-blue-500 px-2 py-0.5 rounded-full border border-blue-500/30">
                      Developer
                    </span>
                  </div>
                  <p
                    className={`text-xs mt-0.5 ${
                      isDarkMode ? "text-neutral-400" : "text-neutral-500"
                    }`}
                  >
                    CloudPhotos v1.3 • Build 11
                  </p>
                </div>
              </div>

              {activeSection === "about" ? (
                <ChevronDown className="w-5 h-5 text-neutral-400" />
              ) : (
                <ChevronRight className="w-5 h-5 text-neutral-400" />
              )}
            </div>

            {/* Chi tiết mục Giới thiệu khi bấm vào */}
            {activeSection === "about" && (
              <div
                className={`p-4 border-t space-y-3.5 animate-in fade-in duration-200 ${
                  isDarkMode ? "border-neutral-800 bg-neutral-950/40" : "border-neutral-100 bg-neutral-50/60"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-500 to-pink-500 text-white flex items-center justify-center font-bold text-base shadow-lg">
                    DN
                  </div>
                  <div>
                    <h4 className="text-base font-bold">Diễn Nguyễn</h4>
                    <p className="text-xs text-neutral-400">
                      Nhà phát triển chính dự án Cloud-Photos
                    </p>
                  </div>
                </div>

                <div
                  className={`p-3 rounded-xl text-xs leading-relaxed ${
                    isDarkMode
                      ? "bg-neutral-800/60 text-neutral-300 border border-neutral-800"
                      : "bg-white text-neutral-700 border border-neutral-200"
                  }`}
                >
                  <p>
                    ☁️ <b>Cloud-Photos</b> là giải pháp lưu trữ và quản lý ảnh/video gia đình không giới hạn dung lượng trên nền tảng <b>Telegram Private Channel</b>, mang giao diện tinh tế, mượt mà chuẩn Apple Photos cho người dùng iPhone/iPad.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div
                    className={`p-2.5 rounded-xl border ${
                      isDarkMode
                        ? "bg-neutral-800/40 border-neutral-800"
                        : "bg-white border-neutral-200"
                    }`}
                  >
                    <span className="text-[11px] block text-neutral-500">Phiên bản:</span>
                    <span className="font-semibold text-sm">v1.3 (Build 11)</span>
                  </div>
                  <div
                    className={`p-2.5 rounded-xl border ${
                      isDarkMode
                        ? "bg-neutral-800/40 border-neutral-800"
                        : "bg-white border-neutral-200"
                    }`}
                  >
                    <span className="text-[11px] block text-neutral-500">Nền tảng:</span>
                    <span className="font-semibold text-sm">Capacitor 8 iOS</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer tuân thủ quy tắc hiển thị Project Rules */}
        <div
          className={`mt-5 pt-3 text-center border-t ${
            isDarkMode ? "border-neutral-800/80" : "border-neutral-200"
          }`}
        >
          <p
            className={`text-[11px] font-medium ${
              isDarkMode ? "text-neutral-500" : "text-neutral-400"
            }`}
          >
            CloudPhotos v1.3 • Build 11 • Made with ❤️ by Diễn Nguyễn
          </p>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;