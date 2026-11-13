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
  ChevronDown,
  ChevronUp,
  Moon,
  Sun,
  Laptop,
  Cloud,
} from "lucide-react";
import {
  requestTelegramCode,
  verifyTelegramCode,
  logoutTelegram,
} from "../services/telegramClient";
import { getCacheStats, clearPhotoCache } from "../services/photoStorage";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: TelegramConfig;
  onSave: (config: TelegramConfig) => void;
  onCacheCleared?: () => void;
  theme: ThemeMode;
  onThemeChange: (theme: ThemeMode) => void;
  isDarkMode: boolean;
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
}) => {
  const [formData, setFormData] = useState<TelegramConfig>(config);
  const [isTelegramSectionOpen, setIsTelegramSectionOpen] = useState(!config.isLoggedIn);
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

  useEffect(() => {
    if (isOpen) {
      setFormData(config);
      setPhone(config.phoneNumber || "");
      getCacheStats().then(setCacheStats);
    }
  }, [isOpen, config]);

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
      setIsTelegramSectionOpen(false);
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
        setStatusMsg("Đã lưu API ID & Hash! Tiếp theo hãy nhập SĐT để nhận mã xác thực.");
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
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold tracking-tight">Cài đặt ứng dụng</h2>
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

        <div className="space-y-4">
          {/* MỤC 1: KẾT NỐI & LƯU TRỮ ĐÁM MÂY (ACCORDION THU GỌN GỌN GÀNG) */}
          <section>
            <h3
              className={`text-xs font-bold uppercase tracking-wider mb-2 px-1 ${
                isDarkMode ? "text-neutral-400" : "text-neutral-500"
              }`}
            >
              Lưu trữ & Đám mây
            </h3>

            <div
              className={`rounded-2xl border overflow-hidden transition-all duration-200 ${
                isDarkMode
                  ? "bg-neutral-900/90 border-neutral-800"
                  : "bg-white border-neutral-200 shadow-sm"
              }`}
            >
              {/* Header của mục Telegram (Bấm để thu gọn / mở rộng) */}
              <div
                onClick={() => setIsTelegramSectionOpen(!isTelegramSectionOpen)}
                className={`p-4 flex items-center justify-between cursor-pointer active:opacity-80 transition-colors ${
                  isTelegramSectionOpen
                    ? isDarkMode
                      ? "border-b border-neutral-800/80"
                      : "border-b border-neutral-100"
                    : ""
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-500 flex items-center justify-center shrink-0">
                    <Cloud className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-sm font-bold flex items-center gap-2">
                      <span>Kênh Telegram MTProto</span>
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
                        : "Lưu ảnh vào Kênh riêng tư không giới hạn"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <span
                    className={`text-xs font-medium mr-1 ${
                      isDarkMode ? "text-neutral-400" : "text-neutral-500"
                    }`}
                  >
                    {isTelegramSectionOpen ? "Thu gọn" : "Cấu hình"}
                  </span>
                  {isTelegramSectionOpen ? (
                    <ChevronUp className="w-4 h-4 text-neutral-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-neutral-400" />
                  )}
                </div>
              </div>

              {/* Nội dung chi tiết cấu hình Telegram khi mở rộng */}
              {isTelegramSectionOpen && (
                <div className="p-4 space-y-4 animate-in fade-in duration-200">
                  {/* Switch tab API vs Login */}
                  <div
                    className={`flex p-1 rounded-xl ${
                      isDarkMode ? "bg-neutral-800/80" : "bg-neutral-100"
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
                          : "text-neutral-500"
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
                          : "text-neutral-500"
                      }`}
                    >
                      Đăng nhập MTProto
                    </button>
                  </div>

                  {activeTab === "api" && (
                    <form onSubmit={handleSubmit} className="space-y-3.5">
                      <p
                        className={`text-xs leading-relaxed ${
                          isDarkMode ? "text-neutral-400" : "text-neutral-600"
                        }`}
                      >
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
                        <label
                          className={`text-xs font-medium flex items-center gap-1.5 mb-1 ${
                            isDarkMode ? "text-neutral-300" : "text-neutral-700"
                          }`}
                        >
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
                          className={`w-full rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${
                            isDarkMode
                              ? "bg-neutral-800 border border-neutral-700 text-white"
                              : "bg-neutral-50 border border-neutral-300 text-black"
                          }`}
                        />
                      </div>

                      <div>
                        <label
                          className={`text-xs font-medium flex items-center gap-1.5 mb-1 ${
                            isDarkMode ? "text-neutral-300" : "text-neutral-700"
                          }`}
                        >
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
                          className={`w-full rounded-xl px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${
                            isDarkMode
                              ? "bg-neutral-800 border border-neutral-700 text-white"
                              : "bg-neutral-50 border border-neutral-300 text-black"
                          }`}
                        />
                      </div>

                      <div>
                        <label
                          className={`text-xs font-medium flex items-center gap-1.5 mb-1 ${
                            isDarkMode ? "text-neutral-300" : "text-neutral-700"
                          }`}
                        >
                          <Hash className="w-3.5 h-3.5 text-blue-500" />
                          ID Kênh lưu trữ (Tùy chọn - Tự động tìm nếu để trống):
                        </label>
                        <input
                          type="text"
                          placeholder="Tự động tìm Kênh 'Kho ảnh đồng bộ Telegram'..."
                          value={formData.channelId}
                          onChange={(e) =>
                            setFormData({ ...formData, channelId: e.target.value.trim() })
                          }
                          className={`w-full rounded-xl px-3 py-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${
                            isDarkMode
                              ? "bg-neutral-800 border border-neutral-700 text-white"
                              : "bg-neutral-50 border border-neutral-300 text-black"
                          }`}
                        />
                      </div>

                      <div className="pt-2 flex gap-2">
                        <button
                          type="submit"
                          className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-xs flex items-center justify-center gap-1.5 active:scale-98 transition-transform"
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
                          <p
                            className={`text-xs mt-1 ${
                              isDarkMode ? "text-neutral-400" : "text-neutral-600"
                            }`}
                          >
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
                          <p
                            className={`text-xs leading-relaxed ${
                              isDarkMode ? "text-neutral-400" : "text-neutral-600"
                            }`}
                          >
                            Đăng nhập tài khoản Telegram để đọc và đồng bộ ảnh an toàn từ Kênh lưu trữ riêng tư của bạn.
                          </p>

                          {step === "phone" && (
                            <div>
                              <label
                                className={`text-xs font-medium flex items-center gap-1.5 mb-1 ${
                                  isDarkMode ? "text-neutral-300" : "text-neutral-700"
                                }`}
                              >
                                <Phone className="w-3.5 h-3.5 text-blue-500" />
                                Số điện thoại Telegram:
                              </label>
                              <input
                                type="text"
                                placeholder="+84xxxxxxxxx"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                className={`w-full rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${
                                  isDarkMode
                                    ? "bg-neutral-800 border border-neutral-700 text-white"
                                    : "bg-neutral-50 border border-neutral-300 text-black"
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
                              <label
                                className={`text-xs font-medium flex items-center gap-1.5 mb-1 ${
                                  isDarkMode ? "text-neutral-300" : "text-neutral-700"
                                }`}
                              >
                                <Lock className="w-3.5 h-3.5 text-blue-500" />
                                Nhập mã xác thực đã nhận:
                              </label>
                              <input
                                type="text"
                                placeholder="12345"
                                value={code}
                                onChange={(e) => setCode(e.target.value)}
                                className={`w-full rounded-xl px-3 py-2 text-sm font-mono tracking-widest text-center focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${
                                  isDarkMode
                                    ? "bg-neutral-800 border border-neutral-700 text-white"
                                    : "bg-neutral-50 border border-neutral-300 text-black"
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
                              <label
                                className={`text-xs font-medium flex items-center gap-1.5 mb-1 ${
                                  isDarkMode ? "text-neutral-300" : "text-neutral-700"
                                }`}
                              >
                                <Lock className="w-3.5 h-3.5 text-purple-500" />
                                Mật khẩu 2FA (Xác thực 2 bước):
                              </label>
                              <input
                                type="password"
                                placeholder="Nhập mật khẩu 2FA..."
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className={`w-full rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all ${
                                  isDarkMode
                                    ? "bg-neutral-800 border border-neutral-700 text-white"
                                    : "bg-neutral-50 border border-neutral-300 text-black"
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

              {/* Mục Offline Cache trong nhóm Lưu trữ */}
              <div
                className={`p-4 border-t flex items-center justify-between ${
                  isDarkMode ? "border-neutral-800" : "border-neutral-100"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-500 flex items-center justify-center shrink-0">
                    <Database className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold">Bộ nhớ đệm (Offline)</h4>
                    <p
                      className={`text-xs mt-0.5 ${
                        isDarkMode ? "text-neutral-400" : "text-neutral-500"
                      }`}
                    >
                      {cacheStats.count > 0
                        ? `${cacheStats.count} ảnh trong máy (${cacheStats.sizeMB} MB)`
                        : "Chưa có ảnh lưu trong bộ nhớ máy"}
                    </p>
                  </div>
                </div>

                {cacheStats.count > 0 && (
                  <button
                    type="button"
                    onClick={handleClearCache}
                    className="px-3 py-1.5 text-xs font-semibold text-red-500 bg-red-500/10 border border-red-500/20 rounded-xl active:scale-95 transition-transform flex items-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Xóa cache
                  </button>
                )}
              </div>
            </div>
          </section>

          {/* MỤC 2: GIAO DIỆN (THEME DARK / LIGHT / AUTO) */}
          <section>
            <h3
              className={`text-xs font-bold uppercase tracking-wider mb-2 px-1 ${
                isDarkMode ? "text-neutral-400" : "text-neutral-500"
              }`}
            >
              Giao diện & Trải nghiệm
            </h3>

            <div
              className={`rounded-2xl border p-4 transition-all duration-200 ${
                isDarkMode
                  ? "bg-neutral-900/90 border-neutral-800"
                  : "bg-white border-neutral-200 shadow-sm"
              }`}
            >
              <div className="flex items-center justify-between mb-3">
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
                    <h4 className="text-sm font-semibold">Chế độ hiển thị</h4>
                    <p
                      className={`text-xs mt-0.5 ${
                        isDarkMode ? "text-neutral-400" : "text-neutral-500"
                      }`}
                    >
                      Tùy chỉnh tông màu Sáng / Tối theo sở thích
                    </p>
                  </div>
                </div>
              </div>

              {/* Segmented Control chọn Theme */}
              <div
                className={`grid grid-cols-3 gap-1.5 p-1 rounded-xl ${
                  isDarkMode ? "bg-neutral-800/80" : "bg-neutral-100"
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
                      ? "text-neutral-400 hover:text-white"
                      : "text-neutral-600 hover:text-black"
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
                      ? "text-neutral-400 hover:text-white"
                      : "text-neutral-600 hover:text-black"
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
                      ? "text-neutral-400 hover:text-white"
                      : "text-neutral-600 hover:text-black"
                  }`}
                >
                  <Laptop className="w-3.5 h-3.5 text-purple-400" />
                  <span>Tự động</span>
                </button>
              </div>
            </div>
          </section>

          {/* MỤC 3: GIỚI THIỆU & NHÀ PHÁT TRIỂN (NGUYỄN ĐIỀN) */}
          <section>
            <h3
              className={`text-xs font-bold uppercase tracking-wider mb-2 px-1 ${
                isDarkMode ? "text-neutral-400" : "text-neutral-500"
              }`}
            >
              Thông tin & Nhà phát triển
            </h3>

            <div
              className={`rounded-2xl border p-4 space-y-3 transition-all duration-200 ${
                isDarkMode
                  ? "bg-neutral-900/90 border-neutral-800"
                  : "bg-white border-neutral-200 shadow-sm"
              }`}
            >
              {/* Profile Card Nhà phát triển */}
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-500 to-pink-500 text-white flex items-center justify-center shrink-0 shadow-lg font-bold text-lg">
                  NĐ
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="text-base font-bold truncate">Nguyễn Điền</h4>
                    <span className="text-[10px] font-semibold bg-blue-500/20 text-blue-500 px-2 py-0.5 rounded-full border border-blue-500/30 shrink-0">
                      Tác giả & Phát triển
                    </span>
                  </div>
                  <p
                    className={`text-xs mt-0.5 ${
                      isDarkMode ? "text-neutral-400" : "text-neutral-500"
                    }`}
                  >
                    Nhà phát triển chính dự án Cloud-Photos
                  </p>
                </div>
              </div>

              {/* Mô tả sứ mệnh ứng dụng */}
              <div
                className={`p-3 rounded-xl text-xs leading-relaxed ${
                  isDarkMode
                    ? "bg-neutral-800/60 text-neutral-300 border border-neutral-800"
                    : "bg-neutral-50 text-neutral-700 border border-neutral-200"
                }`}
              >
                <p>
                  ☁️ <b>Cloud-Photos</b> là giải pháp sao lưu và quản lý ảnh/video gia đình không giới hạn dung lượng trên nền tảng <b>Telegram Private Channel</b>, mang giao diện tinh tế, mượt mà chuẩn Apple Photos cho người dùng iPhone/iPad.
                </p>
              </div>

              {/* Thông tin phiên bản chi tiết */}
              <div
                className={`grid grid-cols-2 gap-2 text-xs pt-1 ${
                  isDarkMode ? "text-neutral-400" : "text-neutral-600"
                }`}
              >
                <div
                  className={`p-2.5 rounded-xl border ${
                    isDarkMode
                      ? "bg-neutral-800/40 border-neutral-800"
                      : "bg-neutral-50 border-neutral-200"
                  }`}
                >
                  <span className="text-[11px] block text-neutral-500">Phiên bản:</span>
                  <span className="font-semibold text-sm">v1.1 (Build 2)</span>
                </div>
                <div
                  className={`p-2.5 rounded-xl border ${
                    isDarkMode
                      ? "bg-neutral-800/40 border-neutral-800"
                      : "bg-neutral-50 border-neutral-200"
                  }`}
                >
                  <span className="text-[11px] block text-neutral-500">Nền tảng:</span>
                  <span className="font-semibold text-sm">Capacitor 8 iOS</span>
                </div>
              </div>
            </div>
          </section>
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
            CloudPhotos v1.1 • Build 2 • Made with ❤️ by Nguyễn Điền
          </p>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;