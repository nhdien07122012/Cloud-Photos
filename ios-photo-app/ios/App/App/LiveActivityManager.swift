import Foundation
import UIKit
#if canImport(ActivityKit)
import ActivityKit
#endif

@objc public class LiveActivityManager: NSObject {
    @objc public static let shared = LiveActivityManager()

    private var currentActivityId: String?
    private var bgTaskId: UIBackgroundTaskIdentifier = .invalid

    private override init() {
        super.init()
    }

    // Yêu cầu iOS duy trì CPU chạy ngầm khi màn hình tắt / ứng dụng chuyển sang nền
    private func beginBackgroundExecution() {
        if bgTaskId != .invalid {
            UIApplication.shared.endBackgroundTask(bgTaskId)
            bgTaskId = .invalid
        }
        bgTaskId = UIApplication.shared.beginBackgroundTask(withName: "CloudPhotosLiveBackupTask") { [weak self] in
            guard let self = self else { return }
            print("[LiveActivity] iOS thông báo background task sắp hết hạn")
            if self.bgTaskId != .invalid {
                UIApplication.shared.endBackgroundTask(self.bgTaskId)
                self.bgTaskId = .invalid
            }
        }
        print("[LiveActivity] Đã kích hoạt chạy ngầm UIBackgroundTaskIdentifier: \(bgTaskId)")
    }

    private func endBackgroundExecution() {
        if bgTaskId != .invalid {
            print("[LiveActivity] Kết thúc chạy ngầm UIBackgroundTaskIdentifier: \(bgTaskId)")
            UIApplication.shared.endBackgroundTask(bgTaskId)
            bgTaskId = .invalid
        }
    }

    @objc public func startActivity(total: Int, initialFileName: String) -> Bool {
        beginBackgroundExecution()

        #if canImport(ActivityKit)
        if #available(iOS 16.2, *) {
            guard ActivityAuthorizationInfo().areActivitiesEnabled else {
                print("[LiveActivity] Live Activities đang bị tắt trong Cài đặt iPhone của người dùng")
                return false
            }

            // Hủy các activity cũ trước khi khởi tạo lượt mới
            endExistingActivities()

            let attributes = BackupActivityAttributes(batchId: UUID().uuidString)
            let initialContentState = BackupActivityAttributes.ContentState(
                current: 0,
                total: total,
                currentFileName: initialFileName.isEmpty ? "Đang quét ảnh..." : initialFileName,
                statusText: "Bắt đầu sao lưu ngầm...",
                progress: 0.0,
                isCompleted: false
            )

            do {
                let activity = try Activity<BackupActivityAttributes>.request(
                    attributes: attributes,
                    content: .init(state: initialContentState, staleDate: nil),
                    pushType: nil
                )
                self.currentActivityId = activity.id
                print("[LiveActivity] Đã khởi tạo thành công Live Activity: \(activity.id)")
                return true
            } catch {
                print("[LiveActivity] Không thể khởi tạo Live Activity: \(error.localizedDescription)")
                return false
            }
        }
        #endif
        return false
    }

    @objc public func updateActivity(current: Int, total: Int, currentFileName: String, statusText: String) {
        #if canImport(ActivityKit)
        if #available(iOS 16.2, *) {
            let progress = total > 0 ? min(1.0, max(0.0, Double(current) / Double(total))) : 0.0
            let isDone = (current >= total && total > 0)
            let state = BackupActivityAttributes.ContentState(
                current: current,
                total: total,
                currentFileName: currentFileName,
                statusText: statusText.isEmpty ? "Đang đồng bộ ảnh..." : statusText,
                progress: progress,
                isCompleted: isDone
            )

            Task {
                for activity in Activity<BackupActivityAttributes>.activities {
                    if self.currentActivityId == nil || activity.id == self.currentActivityId {
                        await activity.update(.init(state: state, staleDate: nil))
                    }
                }
            }
        }
        #endif
    }

    @objc public func endActivity(finalMessage: String) {
        #if canImport(ActivityKit)
        if #available(iOS 16.2, *) {
            Task {
                for activity in Activity<BackupActivityAttributes>.activities {
                    let total = activity.content.state.total
                    let finalState = BackupActivityAttributes.ContentState(
                        current: total,
                        total: total,
                        currentFileName: finalMessage.isEmpty ? "Đã sao lưu xong" : finalMessage,
                        statusText: "Hoàn tất sao lưu 🎉",
                        progress: 1.0,
                        isCompleted: true
                    )
                    // Giữ hiển thị kết quả hoàn tất trong 4 giây rồi tự động ẩn khỏi Màn hình khóa
                    await activity.end(
                        .init(state: finalState, staleDate: nil),
                        dismissalPolicy: .after(Date().addingTimeInterval(4))
                    )
                }
                self.currentActivityId = nil
                self.endBackgroundExecution()
            }
            return
        }
        #endif
        endBackgroundExecution()
    }

    private func endExistingActivities() {
        #if canImport(ActivityKit)
        if #available(iOS 16.2, *) {
            Task {
                for activity in Activity<BackupActivityAttributes>.activities {
                    await activity.end(dismissalPolicy: .immediate)
                }
            }
        }
        #endif
    }
}
