# 📝 Nhật Ký Thay Đổi (Changelog) - Cloud-Photos

Toàn bộ các phiên bản cập nhật, mã bản dựng (build number), chi tiết kỹ thuật và lệnh hoàn tác (rollback) của dự án Cloud-Photos.

---

## [v1.2 (Build 3)] - 2026-11-13
- **Commit SHA**: *Sẽ cập nhật ngay khi commit*
- **Mục tiêu**: Nâng cấp toàn diện logic Album chuẩn Apple Photos (tạo album tùy chỉnh, thêm/chọn ảnh từ kho hoặc import máy), thiết kế bộ App Icon mới phong cách Đám mây kính mờ Frosted Glass + Cánh hoa sắc màu trên nền Midnight Navy, cập nhật thông tin tác giả Diễn Nguyễn, bổ sung chức năng Tự động sao lưu nền (Auto-Sync) và tối ưu giao diện Cài đặt thu gọn dạng Accordion/Drilldown.
- **Chi tiết thay đổi**:
  - `ios-photo-app/src/services/albumStorage.ts`: Khởi tạo dịch vụ quản lý User Custom Albums (tạo mới, thêm ảnh từ kho, gỡ ảnh, xóa album, đọc từ persistent storage).
  - `ios-photo-app/src/types/index.ts`: Bổ sung kiểu `UserAlbum`.
  - `ios-photo-app/src/App.tsx`: Tái cấu trúc Tab Album theo trải nghiệm Apple Photos mặc định, thêm Modal tạo Album, Modal chọn nhiều ảnh có Checkmark, hỗ trợ tải ảnh trực tiếp vào từng Album riêng biệt; tích hợp tính năng Auto-Sync nền.
  - `ios-photo-app/ios/App/App/Assets.xcassets/AppIcon.appiconset/`: Thiết kế và xuất mới toàn bộ kích cỡ icon iOS chất lượng cao mang biểu tượng Đám mây kính mờ Frosted Glass kết hợp cánh hoa quang phổ Apple/Google Photos trên nền Midnight Navy.
  - `ios-photo-app/src/components/SettingsModal.tsx`: Tối ưu hóa giao diện Cài đặt cực kỳ gọn gàng với kiến trúc Accordion (chỉ bung ra chi tiết khi người dùng chạm vào), thêm mục "Sao lưu & Đồng bộ tự động", cập nhật thông tin tác giả Diễn Nguyễn (`CloudPhotos v1.2 • Build 3 • Made with ❤️ by Diễn Nguyễn`).
  - `ios-photo-app/ios/App/App.xcodeproj/project.pbxproj`: Tăng `CURRENT_PROJECT_VERSION` lên `3`, `MARKETING_VERSION` lên `1.2`.
  - `ios-photo-app/package.json`: Tăng version lên `1.2.0`.
  - `README.md`: Cập nhật thông tin tác giả Diễn Nguyễn.
- **Lệnh hoàn tác mẫu (Rollback)**:
  ```bash
  git revert HEAD --no-edit
  ```

---

## [v1.1 (Build 2)] - 2026-11-13
- **Commit SHA**: `44aedae`
- **Mục tiêu**: Khắc phục lỗi upload ảnh & crash camera chụp ảnh trên iOS, tái thiết kế Cài đặt dạng Grouped thu gọn mục Telegram, thêm Dark/Light Mode thủ công, bổ sung thông tin tác giả Nguyễn Điền và bảo mật Bot Token.
- **Chi tiết thay đổi**:
  - `ios-photo-app/ios/App/App/Info.plist`: Bổ sung `NSCameraUsageDescription` và `NSMicrophoneUsageDescription` ngăn chặn crash ứng dụng (SIGABRT) khi người dùng chụp ảnh/quay video từ thiết bị iOS. Dọn dẹp key trùng lặp.
  - `ios-photo-app/src/services/uploadService.ts`: Bọc buffer vào GramJS `CustomFile` chuẩn xác, tự động resolve channel qua `getDialogs` / `autoDetectChannel`, giới hạn `workers: 1` cho độ ổn định tối đa trên mobile, bắt lỗi và hiển thị toast chi tiết.
  - `ios-photo-app/src/components/SettingsModal.tsx`: Tái thiết kế giao diện theo phong cách Apple Settings:
    - Thu nhỏ mục cấu hình Telegram thành Accordion/Item gọn gàng kèm badge trạng thái ("Đã kết nối" / "Chưa đăng nhập").
    - Thêm bộ chọn giao diện Dark Mode / Light Mode / Auto System dạng Segmented Control.
    - Thêm mục Giới thiệu, phiên bản `v1.1 (Build 2)` và thông tin nhà phát triển Nguyễn Điền.
    - Hiển thị footer phiên bản `CloudPhotos v1.1 • Build 2`.
  - `ios-photo-app/src/App.tsx`: Tích hợp quản lý Theme (Dark/Light/Auto), bổ sung iOS Action Sheet khi bấm dấu (+) để chọn giữa "Chọn từ Thư viện ảnh" và "Chụp ảnh mới (Camera)" an toàn, đồng bộ màu sắc theme trên toàn bộ ứng dụng.
  - `ios-photo-app/src/components/Header.tsx`, `TabBar.tsx`, `PhotoGrid.tsx`: Đồng bộ giao diện Dark Mode / Light Mode thích ứng.
  - `ios-photo-app/src/services/telegramClient.ts`: Loại bỏ Bot Token nhạy cảm hardcode, chuyển sang lưu trữ an toàn trong localStorage.
  - `ios-photo-app/src/App.css`: Dọn dẹp toàn bộ mã CSS dư thừa của Vite template.
  - `ios-photo-app/ios/App/App.xcodeproj/project.pbxproj`: Tăng `CURRENT_PROJECT_VERSION` lên `2`, `MARKETING_VERSION` lên `1.1`.
  - `ios-photo-app/package.json`: Tăng version lên `1.1.0`.
  - `.github/workflows/build-ipa.yml`: Tích hợp tự động phát hành Release `latest` kèm link tải trực tiếp 1-chạm file `CloudPhotos.ipa` không cần tìm trên GitHub.
  - `PROJECT_RULES.md`: Bổ sung Điều 5 quy định bắt buộc cung cấp link tải trực tiếp file IPA sau mỗi lần build.
- **Lệnh hoàn tác mẫu (Rollback)**:
  ```bash
  git revert HEAD --no-edit
  ```

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
