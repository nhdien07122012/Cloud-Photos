# 📝 Nhật Ký Thay Đổi (Changelog) - Cloud-Photos

Toàn bộ các phiên bản cập nhật, mã bản dựng (build number), chi tiết kỹ thuật và lệnh hoàn tác (rollback) của dự án Cloud-Photos.

---

## [v1.3 (Build 5)] - 2026-11-13
- **Commit SHA**: `3e567cb`
- **Mục tiêu**: Tinh chỉnh và sửa triệt để lỗi vỡ layout TabBar (loại bỏ chữ text bên dưới icon để chuyển sang thiết kế Icon-Only Floating Dock hiện đại, loại bỏ hoàn toàn tình trạng rớt dòng chữ và tràn viên nang active), đồng thời cân bằng kích thước các nút nổi Thêm (+) và Tìm kiếm để tạo sự đồng bộ cân đối trên màn hình iPhone.
- **Chi tiết thay đổi**:
  - `ios-photo-app/src/components/TabBar.tsx`:
    - Chuyển 4 tab chính (Thư viện, Kỷ niệm, Album, Cài đặt) sang dạng **Icon-Only**: mỗi tab là một nút tròn tỉ lệ 1:1 (`w-12 h-12`), loại bỏ chữ nhãn text phía dưới giúp loại trừ 100% hiện tượng chữ bị bẻ xuống 2 dòng (*"Thư \n viện"*, *"Kỷ \n niệm"*, *"Cài \n đặt"*).
    - Tab active hiển thị dạng viên nang tròn hoàn hảo (`rounded-full`), không còn bị phình hay lồi ra ngoài viền thanh dock.
    - Cân chỉnh kích thước 2 nút tròn nổi bên phải (Thêm `+` và Tìm kiếm) về `52px × 52px` để thẳng hàng đáy hoàn hảo với viên nang điều hướng chính.
    - Giữ nguyên đầy đủ `title` và `aria-label` cho trợ năng và nhận diện.
  - `ios-photo-app/src/components/SettingsModal.tsx`: Đồng bộ số hiệu bản dựng `CloudPhotos v1.3 • Build 5`.
  - `ios-photo-app/ios/App/App.xcodeproj/project.pbxproj`: Tăng `CURRENT_PROJECT_VERSION` lên `5`.
- **Lệnh hoàn tác mẫu (Rollback)**:
  ```bash
  git revert HEAD --no-edit
  ```

---

## [v1.3 (Build 4)] - 2026-11-13
- **Commit SHA**: `86d02d8`
- **Mục tiêu**: Tái thiết kế toàn diện khu vực Header theo phong cách Apple Photos iOS 18 (loại bỏ thanh phân đoạn cũ, đổi tên thành "Thư viện" kèm hiển thị khoảng thời gian lớn), tích hợp Menu popover kính mờ chuẩn iOS (Sắp xếp theo Đã thêm gần đây / Ngày chụp có dấu tích, Lọc nội dung, Tùy chọn xem), bổ sung chế độ Chọn ("Chọn" / "Xong") và Xóa hàng loạt nhiều ảnh cùng một lần trên cả Telegram Channel và IndexedDB, đồng thời phóng to typography và toàn bộ nút bấm cảm ứng (TabBar, Floating Button, Header) giúp thao tác ngón tay cực kỳ dễ dàng.
- **Chi tiết thay đổi**:
  - `ios-photo-app/src/components/Header.tsx`: Tái thiết kế theo iOS 18 Photos:
    - Loại bỏ triệt để thanh phân đoạn (Tất cả / Hôm nay / Tuần này / Yêu thích / Album) phía trên ảnh.
    - Tiêu đề chữ lớn **"Thư viện"** (`text-3xl sm:text-4xl font-extrabold`) kèm dòng phụ đề ngày tháng (e.g. `19 thg 8 – 10 thg 9, 2026`).
    - Nút tròn kính mờ Frosted Glass 3 gạch ngang (`w-11 h-11`) mở Menu Popover chuẩn iOS 18: Sắp xếp theo Đã thêm gần đây / Sắp xếp theo Ngày chụp có dấu tích bên trái, mục Lọc nội dung và Tùy chọn xem mở rộng.
    - Nút viên nang kính mờ lớn **"Chọn" / "Xong"** (`px-5 py-2.5 text-base font-bold`) chuyển đổi chế độ chọn ảnh.
  - `ios-photo-app/src/components/PhotoGrid.tsx`: Bổ sung chế độ chọn ảnh (`isSelectMode`), vòng tròn checkmark xanh dương viền kép trên từng ảnh được chọn, phóng to tiêu đề ngày nhóm ảnh (`text-lg sm:text-xl font-black`).
  - `ios-photo-app/src/components/TabBar.tsx`: Phóng to thanh điều hướng đáy (chiều cao 64px, nhãn `text-xs font-bold`, icon 24px) cùng 2 nút nổi hành động Thêm (+) và Tìm kiếm (62px x 62px, icon 28px).
  - `ios-photo-app/src/services/photoStorage.ts`: Bổ sung hàm `removeMultiplePhotosFromCache(messageIds)` thu hồi Blob URL và xóa sạch các bản ghi ảnh khỏi IndexedDB trong 1 giao dịch duy nhất.
  - `ios-photo-app/src/services/telegramClient.ts`: Bổ sung hàm `deleteMultipleTelegramPhotos(config, messageIds)` thực hiện xóa đồng loạt tin nhắn trên Telegram qua GramJS MTProto `client.deleteMessages(peer, ids, { revoke: true })`.
  - `ios-photo-app/src/App.tsx`: Tích hợp toàn diện logic Chế độ chọn (`isSelectMode`, `selectedPhotoIds`), tính toán dải ngày tự động, Action Bar đáy nổi hiển thị số ảnh đã chọn, nút Chọn tất cả / Bỏ chọn, nút Yêu thích hàng loạt và Xóa hàng loạt kèm Action Sheet xác nhận.
  - `ios-photo-app/src/components/SettingsModal.tsx`: Đồng bộ số hiệu phiên bản `CloudPhotos v1.3 • Build 4` và tên tác giả Diễn Nguyễn.
  - `ios-photo-app/ios/App/App.xcodeproj/project.pbxproj`: Tăng `CURRENT_PROJECT_VERSION` lên `4`, `MARKETING_VERSION` lên `1.3`.
  - `ios-photo-app/package.json`: Tăng version lên `1.3.0`.
- **Lệnh hoàn tác mẫu (Rollback)**:
  ```bash
  git revert HEAD --no-edit
  ```

---

## [v1.2 (Build 3)] - 2026-11-13
- **Commit SHA**: `a3c71aa`
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
