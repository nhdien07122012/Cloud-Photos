import WidgetKit
import SwiftUI
#if canImport(ActivityKit)
import ActivityKit
#endif

@main
struct BackupWidgetBundle: WidgetBundle {
    var body: some Widget {
        #if canImport(ActivityKit)
        if #available(iOSApplicationExtension 16.1, *) {
            BackupLiveActivity()
        }
        #endif
    }
}

#if canImport(ActivityKit)
@available(iOSApplicationExtension 16.1, *)
struct BackupLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: BackupActivityAttributes.self) { context in
            // Giao diện hiển thị trên Màn hình khóa (Lock Screen Banner)
            LockScreenBackupView(context: context)
        } dynamicIsland: { context in
            DynamicIsland {
                // Expanded Leading (Phần mở rộng góc trái khi nhấn giữ Dynamic Island)
                DynamicIslandExpandedRegion(.leading) {
                    HStack(spacing: 8) {
                        ZStack {
                            Circle()
                                .fill(Color.blue.opacity(0.25))
                                .frame(width: 28, height: 28)
                            Image(systemName: "arrow.triangle.2.circlepath")
                                .font(.system(size: 14, weight: .bold))
                                .foregroundColor(.cyan)
                        }
                        VStack(alignment: .leading, spacing: 1) {
                            Text("CloudPhotos")
                                .font(.system(size: 13, weight: .bold))
                                .foregroundColor(.white)
                            Text(context.state.statusText)
                                .font(.system(size: 11))
                                .foregroundColor(.gray)
                                .lineLimit(1)
                        }
                    }
                    .padding(.leading, 6)
                }

                // Expanded Trailing (Phần mở rộng góc phải)
                DynamicIslandExpandedRegion(.trailing) {
                    VStack(alignment: .trailing, spacing: 1) {
                        Text("\(context.state.current)/\(context.state.total)")
                            .font(.system(size: 14, weight: .bold, design: .rounded))
                            .foregroundColor(.cyan)
                        Text("\(Int(context.state.progress * 100))%")
                            .font(.system(size: 11, weight: .semibold))
                            .foregroundColor(.gray)
                    }
                    .padding(.trailing, 6)
                }

                // Expanded Bottom (Thanh tiến trình và tên ảnh đang tải)
                DynamicIslandExpandedRegion(.bottom) {
                    VStack(spacing: 5) {
                        ProgressView(value: context.state.progress)
                            .progressViewStyle(LinearProgressViewStyle(tint: .cyan))
                            .scaleEffect(x: 1, y: 1.4, anchor: .center)

                        HStack {
                            Text(context.state.currentFileName)
                                .font(.system(size: 11))
                                .foregroundColor(.secondary)
                                .lineLimit(1)
                            Spacer()
                            if context.state.isCompleted {
                                Text("Hoàn tất 🎉")
                                    .font(.system(size: 11, weight: .bold))
                                    .foregroundColor(.green)
                            } else {
                                Text("Telegram Cloud")
                                    .font(.system(size: 11, weight: .medium))
                                    .foregroundColor(.cyan)
                            }
                        }
                    }
                    .padding(.horizontal, 10)
                    .padding(.bottom, 6)
                }
            } compactLeading: {
                // Dạng thu gọn bên trái Dynamic Island
                HStack(spacing: 4) {
                    Image(systemName: "arrow.triangle.2.circlepath")
                        .font(.system(size: 11, weight: .bold))
                        .foregroundColor(.cyan)
                    Text("\(context.state.current)/\(context.state.total)")
                        .font(.system(size: 11, weight: .semibold, design: .rounded))
                        .foregroundColor(.white)
                }
                .padding(.leading, 4)
            } compactTrailing: {
                // Dạng thu gọn bên phải Dynamic Island
                Text("\(Int(context.state.progress * 100))%")
                    .font(.system(size: 11, weight: .bold, design: .rounded))
                    .foregroundColor(.cyan)
                    .padding(.trailing, 4)
            } minimal: {
                // Dạng cực tiểu khi có nhiều Live Activities khác
                Image(systemName: "arrow.triangle.2.circlepath")
                    .font(.system(size: 11, weight: .bold))
                    .foregroundColor(.cyan)
            }
        }
    }
}

@available(iOSApplicationExtension 16.1, *)
struct LockScreenBackupView: View {
    let context: ActivityViewContext<BackupActivityAttributes>

    var body: some View {
        VStack(spacing: 10) {
            HStack(alignment: .center) {
                HStack(spacing: 10) {
                    ZStack {
                        Circle()
                            .fill(Color.blue.opacity(0.18))
                            .frame(width: 38, height: 38)
                        Image(systemName: "arrow.triangle.2.circlepath")
                            .font(.system(size: 16, weight: .bold))
                            .foregroundColor(.blue)
                    }
                    VStack(alignment: .leading, spacing: 2) {
                        Text("CloudPhotos Sao lưu ngầm")
                            .font(.system(size: 14, weight: .bold))
                            .foregroundColor(.primary)
                        Text(context.state.statusText)
                            .font(.system(size: 12))
                            .foregroundColor(.secondary)
                            .lineLimit(1)
                    }
                }
                Spacer()
                VStack(alignment: .trailing, spacing: 2) {
                    Text("\(context.state.current)/\(context.state.total) ảnh")
                        .font(.system(size: 14, weight: .bold, design: .rounded))
                        .foregroundColor(.blue)
                    Text("\(Int(context.state.progress * 100))%")
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundColor(.secondary)
                }
            }

            // Thanh tiến trình Gradient trực quan
            ProgressView(value: context.state.progress)
                .progressViewStyle(LinearProgressViewStyle(tint: .blue))

            HStack {
                Text(context.state.currentFileName)
                    .font(.system(size: 11))
                    .foregroundColor(.secondary)
                    .lineLimit(1)
                Spacer()
                if context.state.isCompleted {
                    Text("Đã hoàn tất 🎉")
                        .font(.system(size: 11, weight: .bold))
                        .foregroundColor(.green)
                } else {
                    HStack(spacing: 4) {
                        Circle()
                            .fill(Color.green)
                            .frame(width: 6, height: 6)
                        Text("Telegram Cloud")
                            .font(.system(size: 11, weight: .medium))
                            .foregroundColor(.secondary)
                    }
                }
            }
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
        .activityBackgroundTint(Color.black.opacity(0.85))
        .activitySystemActionForegroundColor(Color.white)
    }
}
#endif
