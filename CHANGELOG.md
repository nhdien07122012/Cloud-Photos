# 📝 Nhật Ký Thay Đổi (Changelog) - Cloud-Photos

Toàn bộ các phiên bản cập nhật, mã bản dựng (build number), chi tiết kỹ thuật và lệnh hoàn tác (rollback) của dự án Cloud-Photos.

---

## [v1.3 (Build 12)] - 2026-11-13
- **Commit SHA**: `7b9ca21`
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
