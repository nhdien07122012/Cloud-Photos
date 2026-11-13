import UIKit
import Capacitor
import Photos
import PhotosUI

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        // Override point for customization after application launch.
        return true
    }

    func applicationWillResignActive(_ application: UIApplication) {
        // Sent when the application is about to move from active to inactive state. This can occur for certain types of temporary interruptions (such as an incoming phone call or SMS message) or when the user quits the application and it begins the transition to the background state.
        // Use this method to pause ongoing tasks, disable timers, and invalidate graphics rendering callbacks. Games should use this method to pause the game.
    }

    func applicationDidEnterBackground(_ application: UIApplication) {
        // Use this method to release shared resources, save user data, invalidate timers, and store enough application state information to restore your application to its current state in case it is terminated later.
        // If your application supports background execution, this method is called instead of applicationWillTerminate: when the user quits.
    }

    func applicationWillEnterForeground(_ application: UIApplication) {
        // Called as part of the transition from the background to the active state; here you can undo many of the changes made on entering the background.
    }

    func applicationDidBecomeActive(_ application: UIApplication) {
        // Restart any tasks that were paused (or not yet started) while the application was inactive. If the application was previously in the background, optionally refresh the user interface.
    }

    func applicationWillTerminate(_ application: UIApplication) {
        // Called when the application is about to terminate. Save data if appropriate. See also applicationDidEnterBackground:.
    }

    func application(_ application: UIApplication,
                     configurationForConnecting connectingSceneSession: UISceneSession,
                     options: UIScene.ConnectionOptions) -> UISceneConfiguration {
        let config = UISceneConfiguration(name: "Default Configuration",
                                          sessionRole: connectingSceneSession.role)
        config.delegateClass = SceneDelegate.self
        return config
    }
}

/**
 * Custom ViewController subclassing CAPBridgeViewController
 * Ensures PhotoSync is actively registered when Capacitor bridge initializes
 */
@objc(ViewController)
public class ViewController: CAPBridgeViewController {
    override open func capacitorDidLoad() {
        super.capacitorDidLoad()
        registerCustomPlugins()
    }

    override open func viewDidLoad() {
        super.viewDidLoad()
        registerCustomPlugins()
    }

    private func registerCustomPlugins() {
        let plugin = PhotoSync()
        bridge?.registerPluginInstance(plugin)
    }
}

/**
 * PhotoSync - Tự động đồng bộ, đọc và dọn dẹp ảnh từ Thư viện iPhone (Camera Roll)
 * Cho phép sao lưu ngầm phong cách Google Photos lên Telegram và giải phóng dung lượng iPhone
 */
@objc(PhotoSync)
public class PhotoSync: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "PhotoSync"
    public let jsName = "PhotoSync"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "checkPermission", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "checkPermissions", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "requestPermission", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "requestPermissions", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "openSettings", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "presentLimitedPicker", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getRecentPhotos", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getPhotoData", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "deletePhotos", returnType: CAPPluginReturnPromise)
    ]

    @objc override public func checkPermissions(_ call: CAPPluginCall) {
        checkPermission(call)
    }

    @objc override public func requestPermissions(_ call: CAPPluginCall) {
        requestPermission(call)
    }

    @objc func checkPermission(_ call: CAPPluginCall) {
        let status: PHAuthorizationStatus
        if #available(iOS 14, *) {
            status = PHPhotoLibrary.authorizationStatus(for: .readWrite)
        } else {
            status = PHPhotoLibrary.authorizationStatus()
        }

        var statusString = "notDetermined"
        switch status {
        case .authorized:
            statusString = "authorized"
        case .limited:
            statusString = "limited"
        case .denied:
            statusString = "denied"
        case .restricted:
            statusString = "restricted"
        case .notDetermined:
            statusString = "notDetermined"
        @unknown default:
            statusString = "unknown"
        }

        call.resolve([
            "status": statusString,
            "granted": (status == .authorized || status == .limited),
            "isFullAccess": (status == .authorized)
        ])
    }

    @objc func requestPermission(_ call: CAPPluginCall) {
        let handler: (PHAuthorizationStatus) -> Void = { status in
            var statusString = "notDetermined"
            switch status {
            case .authorized:
                statusString = "authorized"
            case .limited:
                statusString = "limited"
            case .denied:
                statusString = "denied"
            case .restricted:
                statusString = "restricted"
            case .notDetermined:
                statusString = "notDetermined"
            @unknown default:
                statusString = "unknown"
            }

            DispatchQueue.main.async {
                call.resolve([
                    "status": statusString,
                    "granted": (status == .authorized || status == .limited),
                    "isFullAccess": (status == .authorized)
                ])
            }
        }

        if #available(iOS 14, *) {
            PHPhotoLibrary.requestAuthorization(for: .readWrite, handler: handler)
        } else {
            PHPhotoLibrary.requestAuthorization(handler)
        }
    }

    @objc func openSettings(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            guard let url = URL(string: UIApplication.openSettingsURLString) else {
                call.reject("Không thể mở Cài đặt")
                return
            }
            if UIApplication.shared.canOpenURL(url) {
                UIApplication.shared.open(url, options: [:]) { success in
                    call.resolve(["success": success])
                }
            } else {
                call.reject("Không thể mở Cài đặt iOS")
            }
        }
    }

    @objc func presentLimitedPicker(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            if #available(iOS 14, *) {
                let vc = self.bridge?.viewController ?? UIApplication.shared.windows.first?.rootViewController
                if let rootVC = vc {
                    PHPhotoLibrary.shared().presentLimitedLibraryPicker(from: rootVC)
                    call.resolve(["success": true])
                    return
                }
            }
            call.reject("Chức năng chỉ khả dụng trên iOS 14+")
        }
    }

    @objc func getRecentPhotos(_ call: CAPPluginCall) {
        let limit = call.getInt("limit") ?? 100
        let status: PHAuthorizationStatus
        if #available(iOS 14, *) {
            status = PHPhotoLibrary.authorizationStatus(for: .readWrite)
        } else {
            status = PHPhotoLibrary.authorizationStatus()
        }
        guard status == .authorized || status == .limited else {
            call.reject("Chưa được cấp quyền truy cập Thư viện ảnh")
            return
        }

        let options = PHFetchOptions()
        options.sortDescriptors = [NSSortDescriptor(key: "creationDate", ascending: false)]
        options.predicate = NSPredicate(format: "mediaType == %d AND isHidden == NO", PHAssetMediaType.image.rawValue)
        options.fetchLimit = limit

        // Truy vấn CHỈ TỪ Album Camera Roll / Recents (loại bỏ hoàn toàn ảnh Đã xóa gần đây và Thùng rác)
        let userLibrary = PHAssetCollection.fetchAssetCollections(
            with: .smartAlbum,
            subtype: .smartAlbumUserLibrary,
            options: nil
        ).firstObject

        let assets: PHFetchResult<PHAsset>
        if let library = userLibrary {
            assets = PHAsset.fetchAssets(in: library, options: options)
        } else {
            assets = PHAsset.fetchAssets(with: .image, options: options)
        }

        var result: [[String: Any]] = []
        assets.enumerateObjects { asset, _, _ in
            let date = asset.creationDate?.timeIntervalSince1970 ?? 0
            let resources = PHAssetResource.assetResources(for: asset)
            let filename = resources.first?.originalFilename ?? "photo_\(Int(date)).jpg"
            result.append([
                "id": asset.localIdentifier,
                "filename": filename,
                "timestamp": Int64(date * 1000),
                "width": asset.pixelWidth,
                "height": asset.pixelHeight
            ])
        }
        call.resolve([
            "photos": result,
            "status": (status == .authorized ? "authorized" : "limited")
        ])
    }

    @objc func getPhotoData(_ call: CAPPluginCall) {
        guard let id = call.getString("id") else {
            call.reject("Thiếu localIdentifier của ảnh")
            return
        }

        let assets = PHAsset.fetchAssets(withLocalIdentifiers: [id], options: nil)
        guard let asset = assets.firstObject else {
            call.reject("Không tìm thấy ảnh trên thiết bị")
            return
        }

        let options = PHImageRequestOptions()
        options.isSynchronous = false
        options.deliveryMode = .highQualityFormat
        options.isNetworkAccessAllowed = true

        PHImageManager.default().requestImageDataAndOrientation(for: asset, options: options) { data, _, _, info in
            if let isDegraded = info?[PHImageResultIsDegradedKey] as? Bool, isDegraded {
                return
            }
            if let error = info?[PHImageErrorKey] as? Error {
                call.reject("Lỗi đọc ảnh từ iPhone: \(error.localizedDescription)")
                return
            }
            guard let rawData = data else {
                call.reject("Không thể đọc dữ liệu ảnh từ iPhone")
                return
            }

            // Chuyển đổi định dạng JPEG tối ưu dung lượng và tương thích hiển thị trên mọi nền tảng
            var finalData = rawData
            var finalFilename = "photo_\(Int(Date().timeIntervalSince1970)).jpg"

            let resources = PHAssetResource.assetResources(for: asset)
            if let origName = resources.first?.originalFilename {
                finalFilename = origName
            }

            if let image = UIImage(data: rawData) {
                if let jpeg = image.jpegData(compressionQuality: 0.88) {
                    finalData = jpeg
                    let ext = (finalFilename as NSString).pathExtension.lowercased()
                    if ext == "heic" || ext == "heif" || ext.isEmpty {
                        finalFilename = (finalFilename as NSString).deletingPathExtension + ".jpg"
                    }
                }
            }

            let base64 = finalData.base64EncodedString()
            DispatchQueue.main.async {
                call.resolve([
                    "base64": base64,
                    "filename": finalFilename,
                    "size": finalData.count
                ])
            }
        }
    }

    @objc func deletePhotos(_ call: CAPPluginCall) {
        guard let ids = call.getArray("ids", String.self), !ids.isEmpty else {
            call.reject("Không có danh sách ID ảnh để xóa")
            return
        }

        let assets = PHAsset.fetchAssets(withLocalIdentifiers: ids, options: nil)
        guard assets.count > 0 else {
            call.resolve([
                "success": true,
                "deletedCount": 0
            ])
            return
        }

        PHPhotoLibrary.shared().performChanges({
            PHAssetChangeRequest.deleteAssets(assets)
        }) { success, error in
            DispatchQueue.main.async {
                if success {
                    call.resolve([
                        "success": true,
                        "deletedCount": assets.count
                    ])
                } else {
                    let errMsg = error?.localizedDescription ?? "Người dùng đã từ chối xóa ảnh hoặc có lỗi xảy ra"
                    call.reject(errMsg)
                }
            }
        }
    }

    // MARK: - Safe Fallback Stubs

    @objc func startLiveActivity(_ call: CAPPluginCall) {
        call.resolve(["success": true])
    }

    @objc func updateLiveActivity(_ call: CAPPluginCall) {
        call.resolve(["success": true])
    }

    @objc func endLiveActivity(_ call: CAPPluginCall) {
        call.resolve(["success": true])
    }
}

/**
 * Lớp tương thích ngược đảm bảo cả tên "PhotoSync" và "PhotoSyncPlugin" đều phân giải thành công
 */
@objc(PhotoSyncPlugin)
public class PhotoSyncPlugin: PhotoSync {
}

