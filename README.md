# ☁️ Cloud-Photos (Google Photos Trên Nền Telegram)

Ứng dụng sao lưu, đồng bộ và quản lý ảnh cá nhân/gia đình không giới hạn dung lượng trên nền tảng Telegram Private Channel với giao diện đẳng cấp Apple Photos.

---

## ✨ Tính Năng Nổi Bật

- **Lưu trữ đám mây không giới hạn & miễn phí**: Sử dụng Kênh Telegram riêng tư (*"Kho ảnh đồng bộ Telegram"*) làm ổ cứng lưu trữ an toàn.
- **Tải ảnh lên trực tiếp từ iPhone**: Chọn 1 hoặc nhiều ảnh/video từ Camera Roll để sao lưu lên Telegram chỉ với 1 chạm.
- **Trải nghiệm tức thì (< 0.05s)**: Sử dụng IndexedDB cục bộ trên iPhone giúp mở ứng dụng thấy toàn bộ ảnh ngay lập tức mà không cần chờ tải lại từ mạng.
- **Trình xem ảnh chuyên nghiệp**: Phóng to thu nhỏ 2 ngón (Pinch-to-zoom 1x - 4.5x), chạm đúp, vuốt 1 ngón chuyển ảnh mượt mà, xem ảnh gốc HD/4K.
- **Quản lý an toàn**: Xóa ảnh đồng bộ 2 chiều (vừa xóa trên máy vừa xóa vĩnh viễn trên Kênh Telegram) kèm Action Sheet xác nhận.
- **Đóng gói IPA tự động**: Tích hợp GitHub Actions CI/CD tự động xuất xưởng file `.ipa` sẵn sàng cài đặt qua TrollStore / Sideloadly / AltStore.

---

## 🛠️ Công Nghệ Sử Dụng

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS v4, Lucide Icons.
- **Mobile Runtime**: Capacitor 8 iOS.
- **Storage & MTProto**: GramJS (Telegram MTProto Client), Web IndexedDB.
- **CI/CD**: GitHub Actions macOS Runner (Xcode 16).

---

## 👨‍💻 Tác Giả & Phát Triển
- **Diễn Nguyễn** (`@diennguyen`) - Kiến trúc sư & Nhà phát triển chính của Cloud-Photos.
