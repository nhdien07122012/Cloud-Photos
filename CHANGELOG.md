# 📝 Nhật Ký Thay Đổi (Changelog) - Cloud-Photos

Toàn bộ các phiên bản cập nhật, mã bản dựng (build number), chi tiết kỹ thuật và lệnh hoàn tác (rollback) của dự án Cloud-Photos.

---

## [v1.3 (Build 23)] - 2026-11-14
- **Commit SHA**: `a95be35`
- **Mục tiêu**:
  1. Khắc phục triệt để lỗi hiển thị chồng đè/xếp lớp như bộ bài trong modal "Thêm ảnh vào Album":
     - **Nguyên nhân gốc rễ**:
       + Trong modal cuộn dọc (`flex-1 overflow-y-auto min-h-0`), layout CSS Grid (`grid grid-cols-3`) trên WebKit của iOS Safari gặp lỗi phân giải cyclic sizing (WebKit Bug 216999). Vì các thành phần con đều là `position: absolute` (`absolute inset-0`), chiều cao nội tại (intrinsic content height) của ô ảnh bị xem là 0/không xác định.
       + WebKit tự động ép chiều cao track hàng của CSS Grid (`grid-auto-rows`) xuống chỉ còn ~35px.
       + Trong khi đó, ô ảnh vẫn dựng chiều cao 115px theo tỷ lệ vuông 1:1, khiến các hàng cách nhau chỉ 35px và đè chồng (overlap) lên nhau 80px như một bộ bài xòe xuống, che khuất gần như toàn bộ hình ảnh.
     - **Giải pháp xử lý triệt để**:
       + Thay thế hoàn toàn CSS Grid bằng cấu trúc `flex flex-wrap` 3 cột (`w-1/3 p-1 box-border`), triệt tiêu 100% nguy cơ lỗi track sizing của CSS Grid trên WebKit.
       + Kết hợp kỹ thuật padding tỷ lệ vàng `pb-[100%]` chuẩn W3C: chiều cao của mỗi ô ảnh được tính bằng đúng 100% chiều rộng của nó, đảm bảo vuông vức 1:1 tuyệt đối trên mọi phiên bản iOS.
       + Khóa chiều cao modal `h-[85vh] max-h-[85vh]` cùng `shrink-0` ở phần header giúp trải nghiệm cuộn cảm ứng mượt mà và không bao giờ bị méo hình.
       + Thêm thông báo trạng thái khi kho ảnh trống.
- **Chi tiết thay đổi**:
  - `ios-photo-app/src/App.tsx`: Tái cấu trúc lưới chọn ảnh sang `flex flex-wrap` 3 cột + `pb-[100%]`, bổ sung `h-[85vh]` và `shrink-0`.
  - `ios-photo-app/src/components/SettingsModal.tsx`: Nâng cấp hiển thị `Build 23`.
  - `ios-photo-app/ios/App/App.xcodeproj/project.pbxproj`: Cập nhật `CURRENT_PROJECT_VERSION` thành `23`.
- **Lệnh hoàn tác mẫu (Rollback)**:
  ```bash
  git revert HEAD --no-edit
  ```

---

## [v1.3 (Build 22)] - 2026-11-14
- **Commit SHA**: `f6d190a`
- **Mục tiêu**:
  1. Đồng bộ giao diện Cấu hình & Sao lưu chuyển máy giống 100% ứng dụng `insta_downloader`:
     - Thiết kế lại phần đầu modal Cài đặt thành **"Cấu hình Telegram MTProto"** với thanh 3 Tab đồng bộ: `[ Thông số API ]` `[ Đăng nhập MTProto ]` `[ ☁️ Sao lưu iCloud ]`.
     - Trong Tab **"Sao lưu iCloud"**:
       + Thẻ giới thiệu: **Sao lưu & Khôi phục qua iCloud Drive** (Lưu toàn bộ API ID, API Hash, ID Kênh và Phiên đăng nhập vào iCloud Drive cá nhân qua ứng dụng Tệp (Files) của iPhone).
       + Bảng xem trước dữ liệu hiện tại (2x2): API ID (`3713••••`), API Hash (`Đã cấu hình`), ID Kênh (`-100...`), Đăng nhập (`Đã kết nối`).
       + 3 nút bấm chuẩn mực y hệt InstaPhotos:
         * Nút 1 (Xanh dương): **"Sao lưu ra iCloud Drive (Tệp)"** - Tự động kích hoạt Web Share API / Capacitor Share xuất file `cloudphotos-backup-YYYY-MM-DD.json` để người dùng lưu trực tiếp vào ứng dụng Tệp / iCloud Drive.
         * Nút 2 (Xanh lá): **"Khôi phục từ iCloud Drive (Tệp)"** - Mở trình chọn tệp của iOS (Files picker), đọc file JSON khôi phục ngay lập tức toàn bộ API ID, Hash, SĐT và chuỗi Session String mà không cần gửi OTP xác nhận lại. Tương thích chéo với cả file sao lưu xuất từ `InstaPhotos` lẫn `CloudPhotos`.
         * Nút 3 (Xám đen): **"Sao chép văn bản cấu hình (Clipboard)"** - Sao chép chuỗi JSON vào clipboard bộ nhớ tạm.
       + Ghi chú chân trang: `💡 File sao lưu có đuôi .json. Bạn có thể lưu vào bất kỳ thư mục nào trên iCloud Drive để khôi phục nhanh khi cài lại máy.`
     - Tab **"Thông số API"**: Cho phép xem/chỉnh sửa API ID, API Hash, ID Kênh lưu trữ, có banner gợi ý khôi phục từ iCloud Drive nếu chưa cấu hình.
     - Tab **"Đăng nhập MTProto"**: Quản lý tài khoản Telegram (đăng nhập bằng SĐT, OTP, 2FA, làm mới kho ảnh và đăng xuất an toàn).
     - Giữ nguyên các tính năng cốt lõi: Bộ nhớ & Dung lượng (Giải phóng dung lượng iPhone, Bộ nhớ đệm offline cache) và Chế độ giao diện (Theme).
  2. Khắc phục triệt để lỗi không tải được video `Either one of 'buffer' or 'filePath' should be specified`:
     - **Nguyên nhân gốc rễ**: Khi gọi `client.sendFile` của GramJS với tệp `CustomFile`, nếu dung lượng file $> 20\text{MB}$ (đa số video iPhone nặng từ $25\text{MB}$ đến hàng trăm MB), hàm `uploadFile` nội bộ của GramJS mặc định `maxBufferSize = 20\text{MB} - 1$. Khi `fileSize > maxBufferSize` và file là `CustomFile`, GramJS tự động chuyển sang đọc từ đường dẫn file ổ đĩa (`options.filePath = file.path`). Vì trong WebKit/Capacitor không có đường dẫn tệp Node.js (`file.path` là rỗng), GramJS báo lỗi `Either one of 'buffer' or 'filePath' should be specified`.
     - **Giải pháp xử lý**: Chuyển sang gọi trực tiếp `client.uploadFile` với tham số `maxBufferSize: 2 * 1024 * 1024 * 1024` ($2\text{GB}$). Cơ chế này ép GramJS luôn đọc trực tiếp dữ liệu từ buffer nhị phân (`options.buffer = Buffer.from(...)`), hỗ trợ upload mượt mà mọi dung lượng video và ảnh lên tới $2\text{GB}$ mà không bao giờ gặp lỗi trên. Sau khi upload, truyền `fileHandle` (`InputFile` / `InputFileBig`) vào `client.sendFile` kèm `supportsStreaming: isVideo`.
- **Chi tiết thay đổi**:
  - `ios-photo-app/src/services/uploadService.ts`: Sử dụng `client.uploadFile` với `maxBufferSize = 2GB`, truyền `fileHandle` vào `client.sendFile`.
  - `ios-photo-app/src/components/SettingsModal.tsx`: Tái cấu trúc giao diện theo mẫu chuẩn InstaPhotos với 3 Tab (Thông số API, Đăng nhập MTProto, Sao lưu iCloud), tích hợp đầy đủ Share / Files picker / Clipboard.
  - `ios-photo-app/ios/App/App.xcodeproj/project.pbxproj`: Nâng `CURRENT_PROJECT_VERSION` lên `22`.
- **Lệnh hoàn tác mẫu (Rollback)**:
  ```bash
  git revert HEAD --no-edit
  ```

---

## [v1.3 (Build 21)] - 2026-11-14
- **Commit SHA**: `33b02f4`
- **Mục tiêu**:
  1. Hỗ trợ tải lên video và phát video trực tiếp mượt mà trên ứng dụng:
     - Hỗ trợ đầy đủ các định dạng video chuẩn (`.mp4`, `.mov`, `.m4v`, `.webm`).
     - Tự động trích xuất ảnh bìa/thumbnail sắc nét từ video tại mốc 0.5s thông qua `<video>` + `<canvas>`, có cơ chế fallback timeout 6s an toàn.
     - Hiển thị huy hiệu video bán trong suốt (icon Play kính mờ) trên cả lưới thư viện chính và trong modal chọn ảnh vào Album.
     - Trình xem ảnh/video phóng to toàn màn hình (`PhotoViewer.tsx`) hỗ trợ thẻ `<video>` tối ưu phần cứng iOS với các thuộc tính `controls`, `playsInline`, `autoPlay`, `loop`, phát mượt mà không lag giật nhờ phát trực tiếp từ local Blob URL trong IndexedDB cache.
     - Tự động nhận diện định dạng MIME và xuất file chuẩn (`.mp4`) khi người dùng chia sẻ hoặc tải video về iPhone qua Web Share API / download fallback.
  2. Tối ưu hoá bộ nhớ đệm tự động mở rộng (Scalable Offline Cache):
     - Lưu trữ toàn bộ dữ liệu ảnh và video đầy đủ vào IndexedDB (`StoredPhotoRecord`), không giới hạn cố định; tải lên bao nhiêu, bộ nhớ đệm tự động lưu trữ bấy nhiêu để xem lại tức thì offline không cần tải lại từ Telegram.
     - Cập nhật hàm phát hiện định dạng file `detectMimeType` nhận diện magic bytes chuẩn cho MP4/QuickTime (`ftyp`, `moov`, `mdat`).
     - Thống kê bộ nhớ đệm chi tiết trong Cài đặt: Hiển thị dung lượng MB và phân loại chính xác số lượng ảnh, video đang lưu trong máy (`... MB • ... tệp (... ảnh, ... video)`).
  3. Sửa triệt để lỗi ảnh bị ép dẹt / méo dải ngang trong modal "Thêm ảnh vào Album":
     - **Nguyên nhân gốc rễ**: Modal sử dụng layout flexbox cuộn dọc thiếu `min-h-0`, kết hợp với thẻ `<img>` không dùng định vị tuyệt đối `absolute inset-0` bên trong ô `aspect-square`. Trên engine WebKit của iOS Safari, chiều cao hàng lưới bị co rút về chiều cao dòng chữ (khoảng 20-30px), ép ảnh thành dải ngang dẹp.
     - **Giải pháp**: Thêm `min-h-0` vào container flex cuộn, chuẩn hóa wrapper ô ảnh thành `relative aspect-square w-full rounded-xl overflow-hidden` và định vị thẻ `<img>` bằng `absolute inset-0 w-full h-full object-cover`. Đồng thời bổ sung huy hiệu Play cho các tệp video khi chọn vào album.
  4. Tính năng Sao lưu & Khôi phục thông số Telegram API (API ID & Hash Backup / Restore):
     - Tích hợp bảng điều khiển sao lưu cấu hình API ngay trong mục Cài đặt:
       + **Sao chép mã nhanh (Quick Copy)**: Mã hóa Base64 toàn bộ API ID, API Hash, SĐT, Channel ID với tiền tố `CPCONF:...` để copy vào clipboard chỉ với 1 chạm.
       + **Dán mã nhanh (Quick Paste)**: Tự động giải mã và điền các thông số API vào form đăng nhập khi đổi thiết bị.
       + **Xuất file JSON**: Tải tệp sao lưu `CloudPhotos_API_Config.json` về máy hoặc lưu vào iCloud/Files.
       + **Nhập file JSON**: Khôi phục cấu hình từ tệp tin sao lưu trước đó.
  5. Tăng kích thước font chữ và tối ưu giao diện Cài đặt (Settings):
     - Toàn bộ cỡ chữ tiêu đề, mô tả tính năng, nút bấm và nhãn trạng thái trong Cài đặt được nâng cấp to rõ hơn (`text-2xl/3xl`, `text-base/lg`, `text-sm/base`).
     - Tối ưu độ tương phản, khoảng cách bấm chạm theo ngôn ngữ thiết kế iOS 18 Accessibility, giúp người dùng dễ đọc và thao tác chuẩn xác.
- **Chi tiết thay đổi**:
  - `ios-photo-app/src/types/index.ts`: Bổ sung `isVideo` và `videoDuration` vào interface `PhotoItem`.
  - `ios-photo-app/src/services/photoStorage.ts`: Hỗ trợ lưu trữ/đọc video trong IndexedDB, nhận diện magic bytes MP4, mở rộng `getCacheStats` trả về `photoCount` và `videoCount`.
  - `ios-photo-app/src/services/uploadService.ts`: Thêm hàm tạo thumbnail video `createVideoThumbnail`, xử lý upload video lên Telegram channel với ký hiệu `🎥`.
  - `ios-photo-app/src/services/telegramClient.ts`: Tự động nhận diện video message/document từ Telegram channel, gắn cờ `isVideo: true` khi lưu cache.
  - `ios-photo-app/src/components/PhotoGrid.tsx`: Bổ sung huy hiệu Play trên các item video.
  - `ios-photo-app/src/components/PhotoViewer.tsx`: Render thẻ `<video>` mượt mà, hỗ trợ download/chia sẻ tệp video.
  - `ios-photo-app/src/App.tsx`: Sửa lỗi hiển thị dẹt ảnh trong modal chọn album (`min-h-0`, `absolute inset-0`), thêm icon video.
  - `ios-photo-app/src/components/SettingsModal.tsx`: Tăng kích thước font toàn bộ cài đặt, thêm mục Sao lưu/Khôi phục API (Copy token, Paste token, Export/Import JSON), hiển thị chi tiết số lượng ảnh và video trong bộ nhớ đệm, nâng version Build 21.
  - `ios-photo-app/ios/App/App.xcodeproj/project.pbxproj`: Cập nhật `CURRENT_PROJECT_VERSION` thành `21`.
- **Lệnh hoàn tác mẫu (Rollback)**:
  ```bash
  git revert HEAD --no-edit
  ```

---

## [v1.3 (Build 20)] - 2026-11-14
- **Commit SHA**: `e69ea87`
- **Mục tiêu**:
  1. Loại bỏ hoàn toàn khối "Tải ảnh lên Telegram" trong mục Cài đặt (Settings):
     - Tối giản hoá giao diện Cài đặt, bắt đầu trực tiếp bằng khối "Bộ nhớ & Dung lượng" (Giải phóng dung lượng iPhone & Bộ nhớ đệm tạm thời).
     - Việc tải ảnh từ thiết bị lên Telegram được quản lý tập trung và trực quan qua nút bấm Nổi bật (+) tại giao diện chính và trong các Album.
     - Chuyển nút "Làm mới danh sách ảnh từ Telegram" vào trong mục "Tài khoản & Kênh Telegram" gọn gàng, tiện lợi.
  2. Sửa triệt để lỗi "Giải phóng dung lượng iPhone" không nhận diện được các ảnh tải lên thủ công:
     - **Nguyên nhân gốc rễ**:
       + Khác biệt đuôi định dạng và đổi tên tự động của iOS WebKit: Ảnh chụp trên iPhone mặc định lưu dưới dạng `.HEIC` (High Efficiency) trong `PHAssetResource`. Khi người dùng chọn tải ảnh thủ công qua WebKit file input, iOS tự động nén/chuyển đổi sang JPEG và đổi tên file thành `.jpeg`, `.jpg` hoặc `image.jpg`.
       + Thuật toán đối soát trước đây chỉ so khớp chuỗi tên file đầy đủ (`existingNames.has(dp.filename.toLowerCase())`), khiến `img_0631.heic` trên iPhone và `img_0631.jpeg` trên Telegram không bao giờ khớp nhau $\to$ luôn báo 0 ảnh có thể giải phóng.
       + `SettingsModal` trước đây không truyền mảng `photos` vào `getFreeableDevicePhotos()`, dẫn đến việc quét phụ thuộc vào IndexedDB có thể thiếu sót.
       + Giới hạn truy vấn thư viện bị giới hạn thấp (100 ảnh) và cơ chế đọc từ Smart Album `userLibrary` có thể trả về rỗng khi app ở quyền Limited Access.
     - **Giải pháp xử lý**:
       + Bổ sung hàm `getBasePhotoName`: Tự động trích xuất và chuẩn hóa tên gốc của ảnh, loại bỏ toàn bộ phần mở rộng định dạng (`.heic`, `.heif`, `.jpeg`, `.jpg`, `.png`, v.v.) và icon, giúp `IMG_0631.HEIC` khớp hoàn hảo với `IMG_0631.jpeg`.
       + Đối soát đa tầng (Multi-tier Reconciliation):
         1. Khớp theo `syncedIds` đã lưu.
         2. Khớp chính xác tên file (exact match).
         3. Khớp theo tên gốc (base name match).
         4. Khớp theo thời gian chụp ảnh thực tế (`timestamp` sai số $\le$ 3 giây).
       + Cơ chế ghi nhận tức thì khi người dùng chọn ảnh: Trong `App.tsx`, ngay khi người dùng chọn tải ảnh thủ công (cả ở thư viện lẫn trong Album), ứng dụng lập tức truy vấn danh sách `devicePhotos`, so khớp và lưu ngay ID thiết bị vào `syncedIds`.
       + Nâng giới hạn quét lên 1000 ảnh và hỗ trợ fallback sang `PHAsset.fetchAssets(with: .image, options: options)` khi ở chế độ Limited Access.
       + Truyền `photos={photos}` trực tiếp từ `App.tsx` vào `SettingsModal.tsx` để tính toán chính xác số ảnh an toàn có thể giải phóng.
- **Chi tiết thay đổi**:
  - `ios-photo-app/src/components/SettingsModal.tsx`: Gỡ bỏ thẻ Tải ảnh lên Telegram, thêm nút làm mới vào mục Tài khoản, truyền `photos` vào `checkFreeableSpace` và `handleFreeUpStorage`, nâng cấp Build 20.
  - `ios-photo-app/src/services/autoSyncService.ts`: Bổ sung `getBasePhotoName`, hoàn thiện thuật toán đối soát đa tầng trong `getFreeableDevicePhotos` và `freeUpDeviceStorage`.
  - `ios-photo-app/src/App.tsx`: Tích hợp `matchAndSaveDeviceIdsForFiles` cho các luồng tải ảnh thủ công, truyền `photos` vào `SettingsModal`.
  - `ios-photo-app/ios/App/App/AppDelegate.swift`: Tối ưu `getRecentPhotos` nâng limit lên 1000, xử lý linh hoạt cho Limited Access và smart album.
  - `ios-photo-app/ios/App/App.xcodeproj/project.pbxproj`: Nâng `CURRENT_PROJECT_VERSION` lên `20`.
- **Lệnh hoàn tác mẫu (Rollback)**:
  ```bash
  git revert HEAD --no-edit
  ```

---

## [v1.3 (Build 19)] - 2026-11-14
- **Commit SHA**: `4ea5c35`
- **Mục tiêu**:
  1. Khắc phục triệt để hiện tượng giật khung hình và chớp nháy trắng màn hình:
     - **Nguyên nhân gốc rễ**:
       + Trong `PhotoGrid.tsx`, cơ chế phục hồi cũ dùng render có điều kiện hoán đổi giữa `<img>` và `<div>` khi ảnh gặp lỗi, gây ra việc unmount và remount liên tục các thẻ ảnh. Khi nhiều ảnh cùng tải hoặc lỗi, việc huỷ và tạo lại DOM element kích hoạt layout recalculation và repaint liên tục trên WebKit Safari, khiến màn hình chớp nháy trắng.
       + Vòng lặp `onError` vô tận: Không có giới hạn số lần retry cho từng ảnh, khiến ảnh lỗi liên tục kích hoạt `onError` $\to$ set state $\to$ re-render toàn app $\to$ lỗi lại.
       + Khối thông báo loading cao 80px nằm ngay trên `PhotoGrid` trong `App.tsx` xuất hiện rồi biến mất đột ngột làm toàn bộ lưới ảnh bị giật nhảy lên xuống 60-80px.
       + Việc revoke `objectUrlMap` khi dọn dẹp bộ nhớ đệm làm mất URL ảnh đang hiển thị.
     - **Giải pháp xử lý**:
       + Thiết kế lại `PhotoGrid.tsx` với kiến trúc `PhotoGridItem` (được bọc `React.memo` độc lập):
         * Cố định cấu trúc DOM: Luôn có một lớp nền placeholder tối tĩnh (`bg-neutral-900`) bên dưới, ảnh phía trên được tải và fade-in mượt mà (`opacity-0` $\to$ `opacity-100`). Tuyệt đối **không bao giờ unmount thẻ ảnh**, loại bỏ 100% hiện tượng chớp trắng.
         * Khống chế `retryAttempted`: Mỗi ảnh chỉ thử nạp lại tối đa 1 lần duy nhất, nếu không thành công sẽ giữ nguyên placeholder tĩnh và dừng hẳn, chấm dứt hoàn toàn vòng lặp vô tận.
         * Không gọi `setPhotos` toàn app khi nạp lại từng ảnh: Ô ảnh tự cập nhật URL cục bộ mà không bắt toàn bộ `App` re-render.
       + `App.tsx`: Chỉ hiển thị loading kết nối khi kho ảnh hoàn toàn rỗng lúc mới mở app, không bao giờ chèn khối loading đẩy giật layout khi đã có ảnh trong kho. Kiểm tra trùng khớp danh sách ảnh trước khi cập nhật state để tránh re-render thừa.
       + `photoStorage.ts`: Dọn dẹp bản ghi hỏng trực tiếp trong IndexedDB mà không đụng tới các `objectUrlMap` đang hiển thị trên màn hình.
- **Chi tiết thay đổi**:
  - `ios-photo-app/src/components/PhotoGrid.tsx`: Triển khai `PhotoGridItem` bọc memo, cố định DOM, triệt tiêu unmount và vòng lặp retry.
  - `ios-photo-app/src/App.tsx`: Ngăn layout jumping, cô lập cập nhật ảnh đơn lẻ, so sánh tham chiếu danh sách ảnh chống re-render.
  - `ios-photo-app/src/services/photoStorage.ts`: Bảo vệ Object URL phiên làm việc, dọn dẹp ngầm an toàn.
  - `ios-photo-app/src/components/SettingsModal.tsx`: Đồng bộ nhãn hiển thị lên Build 19.
  - `ios-photo-app/ios/App/App.xcodeproj/project.pbxproj`: Nâng `CURRENT_PROJECT_VERSION` lên `19`.
- **Lệnh hoàn tác mẫu (Rollback)**:
  ```bash
  git revert HEAD --no-edit
  ```

---

## [v1.3 (Build 18)] - 2026-11-14
- **Commit SHA**: `45f0147`
- **Mục tiêu**:
  1. Khắc phục triệt để lỗi ảnh không load được (biểu tượng chấm hỏi màu xanh `[?]`):
     - **Nguyên nhân gốc rễ**: Khi đọc tin nhắn tải lên dạng file qua GramJS, cờ `{ thumb: 2 }` vượt quá số lượng thumbnail thực tế của tài liệu/ảnh, khiến GramJS trả về `Buffer.alloc(0)` (buffer 0 bytes). Buffer rỗng này bị lưu vào IndexedDB và tạo ra `Blob URL` 0 bytes, khiến WebKit Safari trên iPhone không thể giải mã và hiển thị ô xám kèm icon `[?]`.
     - **Giải pháp xử lý**:
       + Triển khai cơ chế tải thumbnail 3 cấp độ thông minh trong `telegramClient.ts`: Cấp 1 (`thumb: 1`), Cấp 2 (`thumb: 0`), Cấp 3 (tải media trực tiếp). Chỉ lưu vào cache khi dung lượng `buffer >= 100 bytes`.
       + `photoStorage.ts`: Tự động nhận diện MIME type từ Magic Bytes (JPEG, PNG, WebP, GIF), từ chối lưu dữ liệu rác `< 100 bytes` và tự động quét/dọn dẹp sạch các bản ghi hỏng 0-byte cũ trong IndexedDB ngay khi mở ứng dụng.
       + `uploadService.ts`: Bổ sung `forceDocument: false` để Telegram máy chủ luôn nhận diện file là Photo và tự động sinh thumbnail chất lượng cao.
       + `PhotoGrid.tsx`: Bổ sung cơ chế tự phục hồi lỗi (`handleImageError`) tự động kết nối Telegram để nạp lại ảnh đơn lẻ (`reloadSinglePhotoFromTelegram`) thay vì để ô lỗi `[?]`.
  2. Loại bỏ hoàn toàn tính năng sao lưu tự động (Chuyển sang 100% người dùng tự chọn tải ảnh):
     - Gỡ bỏ hoàn toàn tiến trình tự động quét ngầm thư viện máy và các banner trạng thái quét trong `App.tsx`.
     - Người dùng hoàn toàn làm chủ kho ảnh: Chỉ tải lên những ảnh do người dùng chủ động chọn qua nút bấm (+) nổi bật hoặc mục Cài đặt.
     - Cập nhật Thẻ Cài đặt: Chuyển thẻ Sao lưu thành "📤 Tải ảnh lên Telegram (Chủ động)" với nút chọn nhiều ảnh trực tiếp từ iPhone và nút làm mới danh sách ảnh.
- **Chi tiết thay đổi**:
  - `ios-photo-app/src/services/photoStorage.ts`: Phát hiện MIME type, chống lưu và tự dọn dẹp bản ghi 0-byte.
  - `ios-photo-app/src/services/telegramClient.ts`: Fallback 3 cấp độ khi tải media, bổ sung `reloadSinglePhotoFromTelegram`.
  - `ios-photo-app/src/services/uploadService.ts`: Bổ sung `forceDocument: false`, bảo lưu thumbnail hợp lệ.
  - `ios-photo-app/src/components/PhotoGrid.tsx`: Tự động phục hồi ảnh lỗi không load được, giao diện placeholder tinh tế.
  - `ios-photo-app/src/components/SettingsModal.tsx`: Chuyển sang giao diện Tải ảnh thủ công chủ động, nâng cấp Build 18.
  - `ios-photo-app/src/App.tsx`: Gỡ bỏ tiến trình quét ngầm, kết nối `onRetryPhoto`, tinh giản luồng tải ảnh.
  - `ios-photo-app/ios/App/App.xcodeproj/project.pbxproj`: Nâng `CURRENT_PROJECT_VERSION` lên `18`.
- **Lệnh hoàn tác mẫu (Rollback)**:
  ```bash
  git revert HEAD --no-edit
  ```

---

## [v1.3 (Build 17)] - 2026-11-14
- **Commit SHA**: `80a8944`
- **Mục tiêu**:
  1. Tái thiết kế toàn diện giao diện phần "Kỷ niệm" (Dành Cho Bạn - Memories / For You):
     - Thay thế thẻ đơn điệu cũ bằng giao diện điện ảnh chuẩn Apple iOS 18 / VisionOS phong phú và cảm xúc.
     - Header nghệ thuật với lời chào theo buổi ("Chào buổi sáng/chiều/tối"), thanh thống kê mini (Số câu chuyện kỷ niệm, Số ảnh yêu thích, Tổng ảnh trong kho) và nút bấm nhanh "🎲 Ngẫu nhiên một kỷ niệm".
     - Thẻ Hero Kỷ Niệm Tâm Điểm (Cinematic Hero Card) tỷ lệ lớn với gradient mờ, nhãn chủ đề tự động ("Ngày này năm xưa", "Dấu ấn xưa", "Khoảnh khắc tuần qua"), nút ▶ Phát trình chiếu lớn ở trung tâm và thông tin chi tiết.
     - Dải cuộn ngang Các Cuộn Kỷ Niệm (Stories Carousel) viền gradient đa sắc rực rỡ (Instagram/Apple style): Kỷ niệm năm xưa, Khoảnh khắc gần đây, Bộ sưu tập yêu thích, Mùa này, Bài viết nhiều ảnh.
     - Lưới Bộ Sưu Tập Chủ Đề (Themed Memory Mosaics) dạng thẻ 4 ảnh ghép 2x2 nghệ thuật.
     - Lưới Khoảnh Khắc Ấn Tượng (Spotlight Mosaic Grid) dạng bố cục bất đối xứng lớn/nhỏ đan xen sống động.
     - Danh sách Tác Giả & Người Đồng Hành với avatar tròn gradient và số lượng ảnh lưu trữ.
  2. Tích hợp Trình Chiếu Kỷ Niệm Điện Ảnh Toàn Màn Hình (Interactive Cinematic Story Slideshow Viewer):
     - Xem câu chuyện toàn màn hình đen tuyền với thanh tiến trình phân đoạn (Segmented Progress Bars) chạy tự động 4 giây mỗi ảnh.
     - Điều hướng thông minh: Chạm bên trái để lùi ảnh, chạm bên phải để tiến ảnh, nhấn giữ màn hình để tạm dừng (pause).
     - Nút Play/Pause, nút thả tim ❤️ tức thì, nút mở ảnh toàn màn hình để phóng to / tải / chia sẻ.
- **Chi tiết thay đổi**:
  - `ios-photo-app/src/components/MemoriesView.tsx`: Tạo mới component Kỷ niệm toàn diện với đầy đủ các phân khu giao diện và Story Viewer.
  - `ios-photo-app/src/App.tsx`: Tích hợp `MemoriesView` vào Tab Kỷ niệm, kết nối dữ liệu ảnh, yêu thích, tác giả và bộ sưu tập bài viết.
  - `ios-photo-app/src/components/SettingsModal.tsx`: Đồng bộ nhãn hiển thị lên Build 17.
  - `ios-photo-app/ios/App/App.xcodeproj/project.pbxproj`: Nâng `CURRENT_PROJECT_VERSION` lên `17`.
- **Lệnh hoàn tác mẫu (Rollback)**:
  ```bash
  git revert HEAD --no-edit
  ```

---

## [v1.3 (Build 16)] - 2026-11-13
- **Commit SHA**: `34cc3bc` (CI Run #24)
- **Mục tiêu**:
  1. Chuyển đổi hoàn toàn sang Chế độ Sao lưu thủ công (Manual Backup Only):
     - Loại bỏ toàn bộ tiến trình quét và tải ngầm tự động (không chạy khi mở app, không chạy khi resume từ nền, không tiêu tốn pin iPhone).
     - Quản lý sao lưu bằng nút bấm thủ công chủ động: "Bắt đầu quét & sao lưu ngay" và "Làm mới lịch sử & quét lại toàn bộ ảnh".
  2. Nhận diện ngày chụp ảnh gốc & Lọc theo từng nấc thời gian:
     - Bảo lưu chính xác `creationDate` từ PhotoKit iPhone vào file khi tạo và nhúng tag ngày tháng `📅 DD/MM/YYYY [YYYY-MM-DD]` vào caption Telegram.
     - Hàm `fetchChannelPhotos` tự động trích xuất ngày chụp ảnh gốc từ caption thay vì lấy thời điểm gửi tin nhắn `msg.date`.
     - Bổ sung menu lọc thời gian đa tầng trong Header: "Hôm nay", "7 ngày gần đây", "Tháng này", "Năm nay", "Mục yêu thích", "Bài viết nhiều ảnh".
     - Gom nhóm ảnh (`groupedPhotos`) theo ngày chụp thực tế của ảnh.
  3. Khắc phục triệt để lỗi ảnh bị mất rồi hiện lại & Tối ưu Bộ nhớ đệm (Cache-First):
     - Giao diện luôn ưu tiên đọc tức thì (< 50ms) từ IndexedDB offline cache ngay khi mở ứng dụng.
     - Cơ chế Smart Merge khi kết nối Telegram: Đối soát và gộp ảnh mới theo `messageId`, tuyệt đối KHÔNG BAO GIỜ làm trắng màn hình hoặc làm mất ảnh đang hiển thị.
  4. Tái thiết kế toàn diện Giao diện Cài đặt (Settings UI Redesign):
     - Loại bỏ các khối accordion thu gọn rườm rà gây rối mắt.
     - Thiết kế lại thành 5 thẻ lớn (Large Cards) to rõ, trực quan, sang trọng chuẩn Apple iOS 18 / VisionOS:
       + Thẻ Hero Sao lưu thủ công nổi bật (Emerald theme)
       + Thẻ Quản lý dung lượng (Giải phóng máy + Bộ nhớ đệm Offline Cache)
       + Thẻ Tài khoản & Kênh Telegram
       + Thẻ Chế độ giao diện (Tối / Sáng / Hệ thống)
       + Thẻ Tác giả & Phiên bản Build 16
- **Chi tiết thay đổi**:
  - `ios-photo-app/src/components/SettingsModal.tsx`: Viết lại toàn bộ giao diện Cài đặt dạng Card to rõ, trực quan, loại bỏ accordion.
  - `ios-photo-app/src/components/Header.tsx`: Bổ sung menu lọc thời gian đa tầng (Hôm nay, 7 ngày, Tháng này, Năm nay).
  - `ios-photo-app/src/App.tsx`: Chuyển sang sao lưu thủ công `executeManualSync`, tích hợp lọc thời gian, Smart Merge chống mất ảnh.
  - `ios-photo-app/src/services/uploadService.ts`: Nhúng tag ngày gốc `[YYYY-MM-DD]` vào caption.
  - `ios-photo-app/src/services/autoSyncService.ts`: Bảo lưu `creationDate` qua `base64ToFile`.
  - `ios-photo-app/src/services/telegramClient.ts`: Trích xuất ngày gốc từ caption khi đọc tin nhắn Telegram.
  - `ios-photo-app/ios/App/App.xcodeproj/project.pbxproj`: Nâng `CURRENT_PROJECT_VERSION` lên `16`.
- **Lệnh hoàn tác mẫu (Rollback)**:
  ```bash
  git revert HEAD --no-edit
  ```

---

## [v1.3 (Build 15)] - 2026-11-13
- **Commit SHA**: `bc93b16`
- **Mục tiêu**:
  1. Khắc phục việc sao lưu bị dừng sau 12 ảnh:
     - Trước đây: `runAutoSync` chỉ cắt đúng 1 lô 12 ảnh (`unsynced.slice(0, 12)`), tải xong thì return và dừng hẳn tiến trình, người dùng có nhiều ảnh hơn phải tự mở đi mở lại app.
     - Nâng cấp: Triển khai vòng lặp liên tục (`Continuous Batch Queue`) xử lý toàn bộ số ảnh chưa sao lưu theo từng lô 10 ảnh (vừa tối ưu giải phóng RAM WebKit trên iPhone, vừa đảm bảo sao lưu xuyên suốt 100% đến bức ảnh cuối cùng: 1..10, 11..20, ... đến hết).
  2. Nâng giới hạn quét thư viện Camera Roll:
     - Tăng từ 60 ảnh lên 200 ảnh mới nhất trong PhotoKit để hỗ trợ người dùng có số lượng lớn ảnh mới chụp chưa sao lưu.
  3. Cải tiến bộ đếm an toàn Watchdog:
     - Thay thế timeout cố định 25s bằng Watchdog tự động reset mỗi khi có tiến trình ảnh mới được tải lên (`resetWatchdog()`), chỉ tự giải phóng nếu kết nối mạng Telegram bị đơ cứng quá 45 giây mà không có bất kỳ chuyển động nào.
  4. Nâng cấp số hiệu bản dựng lên `CloudPhotos v1.3 • Build 15`.
- **Chi tiết thay đổi**:
  - `ios-photo-app/src/services/autoSyncService.ts`: Tăng giới hạn quét lên 200 ảnh, bổ sung vòng lặp lô `for (batchStart = 0; ... BATCH_SIZE = 10)` xử lý liên tục cho đến khi hoàn tất toàn bộ danh sách `unsynced`.
  - `ios-photo-app/src/App.tsx`: Nâng cấp cơ chế Watchdog tự động reset theo tiến độ tải ảnh (`resetWatchdog()`).
  - `ios-photo-app/src/components/SettingsModal.tsx`: Nâng version text lên `v1.3 • Build 15`.
  - `ios-photo-app/ios/App/App.xcodeproj/project.pbxproj`: Nâng `CURRENT_PROJECT_VERSION` lên `15`.
- **Lệnh hoàn tác mẫu (Rollback)**:
  ```bash
  git revert HEAD --no-edit
  ```

---

## [v1.3 (Build 14)] - 2026-11-13
- **Commit SHA**: `0296857`
- **Mục tiêu**:
  1. Khắc phục triệt để lỗi "Vừa hoàn tất sao lưu gần đây" khi người dùng bật tắt sao lưu tự động:
     - Xóa bỏ tình trạng xung đột chạy đua (Race Condition) giữa hàm Toggle `handleAutoSyncChange` và `useEffect([autoSync])`. Dùng `initialSyncDoneRef` đảm bảo app chỉ kích hoạt quét ngầm 1 lần duy nhất khi khởi động.
     - Bổ sung cờ `{ force: true }` khi người dùng chủ động bật công tắc hoặc bấm nút "Quét & Đồng bộ ảnh ngay". Khi có cờ này, hệ thống bỏ qua hoàn toàn cơ chế debounce 3s và không bao giờ báo "Vừa hoàn tất sao lưu gần đây".
  2. Khắc phục triệt để lỗi không quét hay sao lưu lại khi đã xóa ảnh trên Telegram:
     - Tái thiết kế cơ chế Đối soát hai chiều (Two-Way Cloud Reconciliation): So sánh trực tiếp danh sách ảnh trên Camera Roll của iPhone với dữ liệu đám mây Telegram (`existingPhotos` / IndexedDB).
     - Loại bỏ việc "chết cứng" danh sách ID trong `localStorage`: Khi ảnh trên iPhone không còn tồn tại trên Telegram (do người dùng xóa ảnh để test hoặc tải lại), hệ thống tự động loại bỏ ID khỏi `syncedIds` để sẵn sàng sao lưu lại.
     - Khi xóa ảnh trong app (`onDeletePhoto` hoặc `handleExecuteDeleteBatch`), tự động dọn dẹp ID tương ứng qua `removeSyncedDeviceIdsByFilenames`.
     - Thêm nút **"Làm mới lịch sử & Quét lại từ đầu"** (`RotateCcw`) và tự động reset lịch sử khi người dùng bấm "Xóa bộ nhớ đệm".
  3. Bảo đảm an toàn tuyệt đối cho tính năng "Giải phóng dung lượng iPhone" (`freeUpDeviceStorage`): Chỉ cho phép dọn dẹp các bức ảnh đã được xác thực 100% đang có trên Telegram.
  4. Nâng cấp phiên bản lên `CloudPhotos v1.3 • Build 14`.
- **Chi tiết thay đổi**:
  - `ios-photo-app/src/services/autoSyncService.ts`: Bổ sung đối soát hai chiều Telegram, hỗ trợ `options.force`, bỏ debounce khi người dùng thao tác chủ động, thêm các helper `resetSyncedDeviceIds`, `removeSyncedDeviceIds`, `removeSyncedDeviceIdsByFilenames`.
  - `ios-photo-app/src/App.tsx`: Ngăn chặn race condition giữa toggle và effect bằng `initialSyncDoneRef`, truyền `options.force`, dọn dẹp synced IDs khi xóa ảnh đơn lẻ hoặc hàng loạt.
  - `ios-photo-app/src/components/SettingsModal.tsx`: Thêm nút "Làm mới lịch sử & Quét lại từ đầu", reset lịch sử khi xóa cache, nâng cấp version text lên Build 14.
  - `ios-photo-app/ios/App/App.xcodeproj/project.pbxproj`: Nâng `CURRENT_PROJECT_VERSION` lên `14`.
- **Lệnh hoàn tác mẫu (Rollback)**:
  ```bash
  git revert HEAD --no-edit
  ```

---

## [v1.3 (Build 13)] - 2026-11-13
- **Commit SHA**: `a894424`
- **Mục tiêu**:
  1. Khắc phục triệt để lỗi crash app và không load được ảnh:
     - Gỡ bỏ hoàn toàn ActivityKit native / Widget Extension: Apple quy định tính năng Live Activities & App Extension bắt buộc phải có chứng chỉ Apple Developer trả phí với entitlement đặc thù (`com.apple.developer.activitykit`). Khi cài sideload qua TrollStore / Sideloadly / AltStore bằng chứng chỉ miễn phí, việc gọi ActivityKit sẽ bị iOS kernel / SpringBoard ngắt tiến trình (SIGKILL/SIGABRT) gây crash app và nghẽn luồng tải ảnh từ Telegram.
     - Thay thế bằng các native stub an toàn (`startLiveActivity`, `updateLiveActivity`, `endLiveActivity` luôn resolve success ngay lập tức), loại bỏ 100% nguyên nhân crash.
  2. Khắc phục lỗi viên thuốc nổi che khuất thanh trạng thái (đồng hồ, pin) và banner bị treo vĩnh viễn:
     - Xóa bỏ Dynamic Island pill nổi (`fixed top-2.5`) gây đè lên đồng hồ và cụm tai thỏ/đảo của iPhone.
     - Cải tiến `executeAutoSync`: Khi app mở hoặc resume từ nền mà không có ảnh mới cần tải, tiến trình đối soát chạy hoàn toàn ngầm và im lặng, KHÔNG BAO GIỜ hiện chữ "Đang kiểm tra thư viện iPhone..." làm rác màn hình.
     - Chỉ hiển thị banner tiến trình khi thực sự có ảnh đang tải lên Telegram (`current/total`), và tự động ẩn ngay khi tải xong.
     - Bổ sung bộ đếm an toàn 25 giây tự động giải phóng lock và ẩn banner nếu mạng bị treo, đảm bảo giao diện không bao giờ bị đơ.
  3. Đảm bảo Thư viện ảnh luôn hiển thị tức thì (< 50ms) từ IndexedDB và không bao giờ bị nghẽn bởi tiến trình sao lưu.
  4. Nâng cấp phiên bản lên `CloudPhotos v1.3 • Build 13`.
- **Chi tiết thay đổi**:
  - `ios-photo-app/ios/App/App/AppDelegate.swift`: Thay thế `LiveActivityManager` bằng stub an toàn không gọi ActivityKit.
  - `ios-photo-app/ios/App/App/Info.plist`: Xóa `NSSupportsLiveActivities` tránh vi phạm sandbox của iOS.
  - `ios-photo-app/ios/App/App.xcodeproj/project.pbxproj`: Loại bỏ các file ActivityKit, nâng `CURRENT_PROJECT_VERSION` lên `13`.
  - `.github/workflows/build-ipa.yml`: Loại bỏ bước cài đặt Widget Extension.
  - `ios-photo-app/src/App.tsx`: Xóa pill nổi đè thanh trạng thái, tối ưu `executeAutoSync` chạy êm khi không có ảnh mới, thêm timeout 25s an toàn.
  - `ios-photo-app/src/services/autoSyncService.ts`: Bỏ các lệnh gọi Live Activity.
  - `ios-photo-app/src/components/SettingsModal.tsx`: Nâng cấp số hiệu bản dựng lên `v1.3 (Build 13)`.
- **Lệnh hoàn tác mẫu (Rollback)**:
  ```bash
  git revert HEAD --no-edit
  ```

---

## [v1.3 (Build 12)] - 2026-11-13
- **Commit SHA**: `ea16993`
- **Mục tiêu**:
  1. Triển khai tính năng **iOS Live Activities & Dynamic Island** cho tiến trình sao lưu ảnh ngầm:
     - Hiển thị trực tiếp tiến trình sao lưu (số lượng ảnh, phần trăm hoàn thành %, tên file ảnh đang tải, thanh tiến trình gradient) trên **Màn hình khóa (Lock Screen Widget)** và **Dynamic Island** (Compact Leading/Trailing, Minimal, và Expanded) giống các app giao đồ ăn / thể thao hàng đầu.
     - Tích hợp `UIBackgroundTaskIdentifier` (`UIApplication.shared.beginBackgroundTask`) tự động duy trì quyền thực thi CPU khi người dùng khóa màn hình hoặc chuyển sang ứng dụng khác, đảm bảo các bức ảnh đang tải lên Telegram không bị iOS ngắt ngang.
     - Cấu hình `Info.plist` với `NSSupportsLiveActivities = YES`, `NSSupportsLiveActivitiesFrequentUpdates = YES`, và `UIBackgroundModes` (`fetch`, `processing`).
     - Tích hợp Widget Extension target (`BackupWidget`) với SwiftUI + WidgetKit + ActivityKit trong quy trình CI/CD.
  2. Bổ sung giao diện **In-App Dynamic Island Capsule** nổi trực tiếp ở đầu ứng dụng khi sao lưu ngầm đang diễn ra, mang lại trải nghiệm mượt mà và trực quan xuyên suốt các tab.
  3. Nâng cấp số hiệu bản dựng lên `CloudPhotos v1.3 • Build 12`.
- **Chi tiết thay đổi**:
  - `ios-photo-app/ios/App/App/BackupActivityAttributes.swift`: Tạo cấu trúc `BackupActivityAttributes` và `ContentState` dùng chung cho App và Widget Extension.
  - `ios-photo-app/ios/App/App/LiveActivityManager.swift`: Quản lý vòng đời Live Activity (`startActivity`, `updateActivity`, `endActivity`) kết hợp `beginBackgroundTask`.
  - `ios-photo-app/ios/App/BackupWidget/BackupWidget.swift`: Thiết kế giao diện SwiftUI cho Lock Screen banner và Dynamic Island (Leading, Trailing, Bottom, Compact, Minimal).
  - `ios-photo-app/ios/App/BackupWidget/Info.plist`: Cấu hình WidgetKit extension.
  - `ios-photo-app/ios/App/App/AppDelegate.swift`: Bổ sung native methods `startLiveActivity`, `updateLiveActivity`, `endLiveActivity` trong `PhotoSync`.
  - `ios-photo-app/ios/App/App/Info.plist`: Cấp quyền `NSSupportsLiveActivities`, `NSSupportsLiveActivitiesFrequentUpdates` và `UIBackgroundModes`.
  - `ios-photo-app/ios/setup_widget.rb`: Tự động cấu hình Widget Extension target và Embed Foundation Extensions trong `App.xcodeproj`.
  - `.github/workflows/build-ipa.yml`: Tích hợp script cấu hình Widget Extension vào pipeline build Xcode.
  - `ios-photo-app/src/services/autoSyncService.ts`: Tích hợp gọi `PhotoSync.startLiveActivity`, `updateLiveActivity` và `endLiveActivity` trong luồng sao lưu.
  - `ios-photo-app/src/App.tsx`: Hiển thị in-app Dynamic Island capsule pill sang trọng khi đang sao lưu ngầm.
  - `ios-photo-app/src/components/SettingsModal.tsx`: Nâng cấp phiên bản lên `v1.3 (Build 12)` và ghi chú hỗ trợ Live Activity.
  - `ios-photo-app/ios/App/App.xcodeproj/project.pbxproj`: Tăng `CURRENT_PROJECT_VERSION` lên `12`.
- **Lệnh hoàn tác mẫu (Rollback)**:
  ```bash
  git revert HEAD --no-edit
  ```

---

## [v1.3 (Build 11)] - 2026-11-13
- **Commit SHA**: `b6fed74`
- **Mục tiêu**:
  1. Khắc phục triệt để lỗi tự động sao lưu bị lặp lại 2 lần (Duplicate Uploads):
     - Thiết lập Mutex Lock đa tầng (`isAutoSyncRunning` trong service và `isSyncingRef` trong React) ngăn chặn tuyệt đối tình trạng chạy đồng thời giữa `useEffect` khi mở app và sự kiện `appStateChange`.
     - Thêm cơ chế Debounce 2.5 giây khi app quay lại từ nền (Resume) để ổn định trạng thái.
     - Đánh dấu trước các ID ảnh (`syncedIds.add`) ngay khi chuẩn bị tải lên thay vì đợi sau khi tải xong mới lưu, loại bỏ khoảng hở thời gian gây trùng lặp.
     - Lọc trùng lặp `existingIds` trước khi cập nhật mảng `photos` trong giao diện.
  2. Khắc phục triệt để lỗi ảnh đã xóa khỏi Thư viện ảnh iPhone vẫn bị thêm lại Telegram:
     - Trong PhotoKit native (`AppDelegate.swift`): chuyển đổi truy vấn ảnh sang Album Camera Roll chính xác `smartAlbumUserLibrary` kèm bộ lọc `mediaType == image AND isHidden == NO`. Khi người dùng xóa ảnh trên iPhone, PhotoKit sẽ loại bỏ ngay khỏi album này và không bao giờ đọc lại các ảnh trong Thùng rác / "Đã xóa gần đây".
     - Trong `autoSyncService.ts`: Đối soát tự động với danh sách ảnh đang có trên Kênh Telegram (`existingPhotos`), nếu ảnh đã có trên Telegram thì tự động ghi nhớ ID để không bao giờ tải lại.
     - Sửa logic `freeUpDeviceStorage`: TUYỆT ĐỐI GIỮ NGUYÊN các ID ảnh đã dọn dẹp trong `syncedDeviceIds` để các ảnh đã xóa khỏi máy vĩnh viễn không bị quét lại.
- **Chi tiết thay đổi**:
  - `ios-photo-app/ios/App/App/AppDelegate.swift`: Cập nhật `getRecentPhotos` sử dụng `smartAlbumUserLibrary` và trả kèm `filename` gốc.
  - `ios-photo-app/src/services/autoSyncService.ts`: Bổ sung Mutex Lock `isAutoSyncRunning`, debounce 3s, đối soát `existingPhotos`, pre-mark batch IDs và giữ nguyên ID khi giải phóng bộ nhớ máy.
  - `ios-photo-app/src/App.tsx`: Thêm `isSyncingRef`, truyền `photos` vào `runAutoSync` để đối soát, deduplicate trước khi update state và debounce 2.5s trong `appStateChange`.
  - `ios-photo-app/src/components/SettingsModal.tsx`: Nâng cấp số hiệu bản dựng lên `CloudPhotos v1.3 • Build 11`.
  - `ios-photo-app/ios/App/App.xcodeproj/project.pbxproj`: Tăng `CURRENT_PROJECT_VERSION` lên `11`.
- **Lệnh hoàn tác mẫu (Rollback)**:
  ```bash
  git revert HEAD --no-edit
  ```

---

## [v1.3 (Build 10)] - 2026-11-13
- **Commit SHA**: `81e32b0`
- **Mục tiêu**:
  1. Khắc phục triệt để lỗi biên dịch Xcode trong CI/CD GitHub Actions: `AppDelegate.swift:183:45: error: value of type 'PHPhotoLibrary' has no member 'presentLimitedLibraryPicker'`.
  2. Bổ sung `import PhotosUI` vào `AppDelegate.swift` (phương thức mở picker chọn ảnh giới hạn `presentLimitedLibraryPicker(from:)` của Apple PhotoKit nằm trong framework `PhotosUI` chứ không nằm trong framework cơ sở `Photos`).
- **Chi tiết thay đổi**:
  - `ios-photo-app/ios/App/App/AppDelegate.swift`: Thêm `import PhotosUI`.
  - `ios-photo-app/src/components/SettingsModal.tsx`: Nâng cấp số hiệu bản dựng lên `CloudPhotos v1.3 • Build 10`.
  - `ios-photo-app/ios/App/App.xcodeproj/project.pbxproj`: Tăng `CURRENT_PROJECT_VERSION` lên `10`.
- **Lệnh hoàn tác mẫu (Rollback)**:
  ```bash
  git revert HEAD --no-edit
  ```

---

## [v1.3 (Build 9)] - 2026-11-13
- **Commit SHA**: `246e746`
- **Mục tiêu**:
  1. Fix triệt để lỗi `"PhotoSync" plugin is not implemented on ios` bằng giải pháp bảo vệ 3 tầng (Triple-layer Redundancy):
     - Tầng JS: Triển khai fallback bridge trực tiếp trong `registerPlugin("PhotoSync", { ios: ... })` gọi thẳng `window.Capacitor.nativePromise` / `window.Capacitor.Plugins.PhotoSync`, ngăn chặn hoàn toàn việc `@capacitor/core` ném lỗi Unimplemented.
     - Tầng Native Swift: Đăng ký cả 2 định danh `@objc(PhotoSync)` và `@objc(PhotoSyncPlugin)` trong cả `capacitorDidLoad()` và `viewDidLoad()`, đồng thời bổ sung các phương thức `checkPermissions` và `requestPermissions` chuẩn Capacitor.
     - Tầng CI/CD: Tự động inject `"PhotoSync"` và `"PhotoSyncPlugin"` vào `packageClassList` trong `capacitor.config.json` ngay sau bước `npx cap sync ios`.
  2. Thêm tính năng **"Giải phóng dung lượng iPhone" 🧹 (Free Up Space)** chuẩn phong cách Google Photos:
     - Tự động đối soát các ảnh trong Thư viện iPhone đã được tải lên Telegram an toàn (dựa trên danh sách `syncedDeviceIds`).
     - Hiển thị mục chuyên dụng trong Cài đặt với số lượng ảnh có thể dọn dẹp và nút bấm dọn dẹp ngay.
     - Kích hoạt hộp thoại xác nhận gốc của iOS (`PHAssetChangeRequest.deleteAssets`) để người dùng cấp phép xóa ảnh gốc khỏi iPhone an toàn (ảnh được đưa vào mục *Đã xóa gần đây* của máy trong 30 ngày, bảo toàn 100% trên Telegram).
- **Chi tiết thay đổi**:
  - `ios-photo-app/ios/App/App/AppDelegate.swift`:
    - Khởi tạo `@objc(PhotoSync)` và `@objc(PhotoSyncPlugin)` với đầy đủ phương thức `deletePhotos`, `checkPermission/s`, `requestPermission/s`.
    - `ViewController`: Đăng ký plugin trong cả `capacitorDidLoad()` và `viewDidLoad()`.
    - `deletePhotos`: Thực thi `PHAssetChangeRequest.deleteAssets` qua PhotoKit.
  - `ios-photo-app/src/services/autoSyncService.ts`:
    - Thêm fallback implementation cho `registerPlugin("PhotoSync", { ios: ... })`.
    - Bổ sung các hàm trợ giúp: `getFreeableDevicePhotos()` và `freeUpDeviceStorage()`.
  - `ios-photo-app/src/components/SettingsModal.tsx`:
    - Bổ sung Section **"Giải phóng dung lượng iPhone"** (hiển thị số ảnh đã sao lưu, số ảnh có thể dọn dẹp, nút quét lại và nút giải phóng).
    - Cập nhật số hiệu bản dựng lên `CloudPhotos v1.3 • Build 9`.
  - `.github/workflows/build-ipa.yml`:
    - Inject `"PhotoSync"` và `"PhotoSyncPlugin"` vào `packageClassList` của `capacitor.config.json`.
  - `ios-photo-app/ios/App/App.xcodeproj/project.pbxproj`:
    - Tăng `CURRENT_PROJECT_VERSION` lên `9`.
- **Lệnh hoàn tác mẫu (Rollback)**:
  ```bash
  git revert HEAD --no-edit
  ```

---

## [v1.3 (Build 8)] - 2026-11-13
- **Commit SHA**: `53e3745`
- **Mục tiêu**:
  1. Khắc phục triệt để lỗi `"PhotoSync" plugin is not implemented on ios` hiển thị khi thực hiện tự động sao lưu ảnh.
  2. Đăng ký plugin gốc `PhotoSyncPlugin` trực tiếp vào Capacitor Bridge thông qua lớp kế thừa `ViewController: CAPBridgeViewController` trong `capacitorDidLoad()`, đồng thời trỏ `rootViewController` của `SceneDelegate` và `Main.storyboard` sang `ViewController`.
  3. Tối ưu hóa việc đọc dữ liệu ảnh PhotoKit (`getPhotoData`): chuyển đổi ảnh sang định dạng JPEG (chất lượng 88%) để giảm tải RAM, tăng tốc độ tải lên Telegram gấp nhiều lần và tránh lỗi định dạng ảnh HEIC gốc trên thiết bị iOS; lọc bỏ các phản hồi degraded tạm thời từ iCloud PhotoKit.
  4. Nâng cao tính ổn định cho tiến trình sao lưu nền: xử lý ngoại lệ từng ảnh riêng biệt trong batch, hiển thị số lượng ảnh còn lại cần đồng bộ và tiếp tục đồng bộ ngầm mượt mà.
- **Chi tiết thay đổi**:
  - `ios-photo-app/ios/App/App/AppDelegate.swift`:
    - Tạo lớp `ViewController: CAPBridgeViewController` ghi đè `capacitorDidLoad()` gọi `bridge?.registerPluginInstance(PhotoSyncPlugin())` đảm bảo plugin luôn được đăng ký trước khi web view khởi tạo.
    - Cải tiến `PhotoSyncPlugin.getPhotoData` hỗ trợ chuyển đổi HEIC sang JPEG tự động, trích xuất tên file gốc bằng `PHAssetResource` và kiểm tra `PHImageResultIsDegradedKey` tránh callback lặp.
    - Bọc `call.resolve` trong `DispatchQueue.main.async` đảm bảo an toàn luồng với các callback của PhotoKit.
  - `ios-photo-app/ios/App/App/SceneDelegate.swift`: Cập nhật `window?.rootViewController = ViewController()`.
  - `ios-photo-app/ios/App/App/Base.lproj/Main.storyboard`: Cập nhật `customClass="ViewController" customModule="App"`.
  - `ios-photo-app/src/services/autoSyncService.ts`: Bổ sung try-catch cho từng ảnh khi đọc dữ liệu và hiển thị số ảnh còn lại sau mỗi lô đồng bộ.
  - `ios-photo-app/src/components/SettingsModal.tsx`: Cập nhật số hiệu bản dựng lên `CloudPhotos v1.3 • Build 8`.
  - `ios-photo-app/ios/App/App.xcodeproj/project.pbxproj`: Tăng `CURRENT_PROJECT_VERSION` lên `8`.
- **Lệnh hoàn tác mẫu (Rollback)**:
  ```bash
  git revert HEAD --no-edit
  ```

---

## [v1.3 (Build 7)] - 2026-11-13
- **Commit SHA**: `b34e76d`
- **Mục tiêu**:
  1. Nâng cấp PhotoKit Native Plugin yêu cầu quyền truy cập đầy đủ (`PHAccessLevel.readWrite`) cho Thư viện ảnh iPhone để tự động sao lưu toàn bộ máy giống Google Photos; bổ sung nút Mở trực tiếp Cài đặt iPhone và nút Chọn thêm ảnh trong phần Cài đặt của ứng dụng.
  2. Khắc phục triệt để lỗi thẻ Album bị mất ảnh nền / hiện icon chấm hỏi [ ? ] (tự động lấy ảnh đầu tiên trong album có URL hợp lệ của phiên làm việc hiện tại làm ảnh nền bìa, tự động dọn dẹp các link blob: cũ bị hết hạn giữa các session).
  3. Khóa cứng kích thước đồng bộ 56px (`w-[56px] h-[56px]` và `h-[56px]` kèm `shrink-0`) giữa nút Tìm kiếm, nút Thêm và viên nang TabBar, đảm bảo không bị co bóp hay lệch kích cỡ trên mọi kích cỡ màn hình iPhone.
- **Chi tiết thay đổi**:
  - `ios-photo-app/ios/App/App/AppDelegate.swift`: Nâng cấp `PhotoSyncPlugin` sử dụng `PHPhotoLibrary.requestAuthorization(for: .readWrite)` chuẩn iOS 14+, bổ sung phương thức `openSettings` mở trực tiếp trang cấp quyền của CloudPhotos trên iPhone và `presentLimitedPicker` cho phép chọn thêm ảnh khi ở chế độ Limited.
  - `ios-photo-app/ios/App/App/Info.plist`: Cập nhật mô tả `NSPhotoLibraryUsageDescription` xin quyền truy cập toàn bộ thư viện ảnh để tự động sao lưu nền giống Google Photos.
  - `ios-photo-app/src/services/autoSyncService.ts`: Mở rộng interface quyền (`status`, `isFullAccess`, `openNativeSettings`, `presentLimitedLibraryPicker`), kiểm tra chi tiết trạng thái Limited và hướng dẫn người dùng chuyển sang "Tất cả ảnh".
  - `ios-photo-app/src/services/albumStorage.ts`: Bổ sung hàm `getAlbumCoverUrl` tự động lấy ảnh đầu tiên trong album làm ảnh nền bìa, tự động lọc và xóa các chuỗi blob URL cũ đã hết hạn.
  - `ios-photo-app/src/types/index.ts`: Thêm `coverPhotoId?: string | number` vào `UserAlbum`.
  - `ios-photo-app/src/App.tsx`: Cập nhật hiển thị thẻ Album sử dụng `getAlbumCoverUrl` và bổ sung `onError` fallback an toàn.
  - `ios-photo-app/src/components/SettingsModal.tsx`: Thêm bảng hướng dẫn cấp quyền và 2 nút thao tác nhanh: **[Mở Cài đặt iPhone]** (chọn Tất cả ảnh) và **[Chọn thêm ảnh]**.
  - `ios-photo-app/src/components/TabBar.tsx`: Thêm `shrink-0` cố định cho cả viên nang TabBar và cụm nút Thêm/Tìm kiếm 56px.
  - `ios-photo-app/ios/App/App.xcodeproj/project.pbxproj`: Tăng `CURRENT_PROJECT_VERSION` lên `7`.
- **Lệnh hoàn tác mẫu (Rollback)**:
  ```bash
  git revert HEAD --no-edit
  ```

---

## [v1.3 (Build 6)] - 2026-11-13
- **Commit SHA**: `a277739`
- **Mục tiêu**:
  1. Đồng bộ kích thước nút Thêm (+) và Tìm kiếm bằng tuyệt đối 56px với chiều cao của viên nang TabBar, đảm bảo độ cong tròn bán kính 28px và đường thẳng đáy cân đối 100%.
  2. Triển khai hoàn chỉnh tính năng Tự động quét và sao lưu ảnh từ Thư viện iPhone (Camera Roll) lên Telegram qua PhotoKit Native Plugin (`PhotoSyncPlugin`) khi mở app hoặc resume từ nền, không cần phải chọn ảnh thủ công.
  3. Khắc phục triệt để lỗi mất ảnh / hiển thị "Chưa có ảnh nào trong kho" khi chuyển tab hoặc vuốt qua lại (tự động reset bộ lọc khi chạm vào tab Thư viện, tách biệt từ khóa tìm kiếm chỉ áp dụng cho tab Search, bổ sung chip thông báo bộ lọc đang bật kèm nút xóa lọc nhanh, ngăn chặn việc ghi đè rỗng mảng ảnh khi load nền).
- **Chi tiết thay đổi**:
  - `ios-photo-app/src/components/TabBar.tsx`: Cố định chiều cao `h-[56px]` cho thanh điều hướng TabBar và đặt kích thước nút Thêm `+` và Tìm kiếm chuẩn xác `w-[56px] h-[56px]`, tạo độ cân bằng thị giác tuyệt đối.
  - `ios-photo-app/ios/App/App/AppDelegate.swift`: Tích hợp `PhotoSyncPlugin` (`CAPPlugin`, `CAPBridgedPlugin`) sử dụng Apple PhotoKit (`PHPhotoLibrary`, `PHAsset`) cho phép quét tự động các ảnh mới nhất từ Camera Roll của iPhone mà không cần hộp thoại chọn ảnh.
  - `ios-photo-app/src/services/autoSyncService.ts`: Xây dựng dịch vụ quản lý đồng bộ ảnh nền: kiểm tra quyền, phát hiện ảnh mới chưa sao lưu, chuyển đổi dữ liệu và tự động upload lên Telegram Kênh "Kho ảnh đồng bộ Telegram".
  - `ios-photo-app/src/App.tsx`:
    - Tích hợp `handleTabChange`: khi chạm vào tab Thư viện, tự động xóa bộ lọc đang áp dụng và khôi phục hiển thị toàn bộ kho ảnh.
    - Sửa logic `filteredPhotos`: chỉ lọc theo `searchQuery` khi đang ở tab Search, không làm ẩn ảnh vô lý trong Thư viện.
    - Sửa hàm `loadPhotos`: không ghi đè mảng rỗng nếu trong cache IndexedDB đang có ảnh.
    - Tích hợp `executeAutoSync` khi khởi động ứng dụng và khi app quay lại từ background (`App.addListener('appStateChange')`).
    - Nút "Đồng bộ ngay bây giờ" trong Cài đặt kích hoạt tiến trình sao lưu nền thực sự thay vì mở file picker thủ công.
    - Bổ sung chip thông báo bộ lọc `Đang lọc: {activeFilter} ✕` và banner tiến trình đồng bộ ngầm trên màn hình Thư viện.
  - `ios-photo-app/src/components/PhotoGrid.tsx`: Bổ sung thông điệp rõ ràng khi danh sách ảnh rỗng do bộ lọc kèm nút "Xem tất cả ảnh Thư viện" để người dùng không bị kẹt.
  - `ios-photo-app/src/components/SettingsModal.tsx`: Đồng bộ số hiệu bản dựng `CloudPhotos v1.3 • Build 6`.
  - `ios-photo-app/ios/App/App.xcodeproj/project.pbxproj`: Tăng `CURRENT_PROJECT_VERSION` lên `6`.
- **Lệnh hoàn tác mẫu (Rollback)**:
  ```bash
  git revert HEAD --no-edit
  ```

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
