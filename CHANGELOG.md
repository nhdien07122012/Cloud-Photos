# 📝 Nhật Ký Thay Đổi (Changelog) - Cloud-Photos

Toàn bộ các phiên bản cập nhật, mã bản dựng (build number), chi tiết kỹ thuật và lệnh hoàn tác (rollback) của dự án Cloud-Photos.

---

## [v1.0 (Build 1)] - 2026-11-13
- **Commit SHA**: `432af06`
- **Mục tiêu**: Khởi tạo dự án Cloud-Photos độc lập (Google Photos trên nền Telegram), tích hợp bộ quy chuẩn `PROJECT_RULES.md`, hệ thống chọn và tải ảnh Camera Roll lên Kênh Telegram "Kho ảnh đồng bộ Telegram", lưu trữ IndexedDB tức thì và giao diện chuẩn Apple Photos.
- **Chi tiết thay đổi**:
  - `PROJECT_RULES.md`: Thiết lập 5 điều khoản kỷ luật bất di bất dịch cho Cloud-Photos.
  - `ios-photo-app/`: Toàn bộ hạ tầng React 19 + TypeScript + Vite + Tailwind CSS v4 + Capacitor 8 iOS.
  - `ios-photo-app/src/services/uploadService.ts`: Module chọn ảnh và upload ảnh/video từ máy lên Telegram MTProto kèm tiến trình.
  - `ios-photo-app/src/services/telegramClient.ts`: Tự động tìm kiếm và kết nối Kênh "Kho ảnh đồng bộ Telegram", tải ảnh và đồng bộ đám mây.
  - `ios-photo-app/src/services/photoStorage.ts`: Bộ nhớ đệm IndexedDB cục bộ giúp mở app xem ảnh tức thì.
  - `.github/workflows/build-ipa.yml`: Tự động đóng gói file `.ipa` trên macOS runner.
- **Lệnh hoàn tác mẫu (Rollback)**:
  ```bash
  git revert HEAD --no-edit
  ```
