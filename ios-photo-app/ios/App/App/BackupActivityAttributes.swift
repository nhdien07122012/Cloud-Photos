import Foundation
#if canImport(ActivityKit)
import ActivityKit
#endif

#if canImport(ActivityKit)
public struct BackupActivityAttributes: ActivityAttributes {
    public struct ContentState: Codable, Hashable {
        public var current: Int
        public var total: Int
        public var currentFileName: String
        public var statusText: String
        public var progress: Double // 0.0 -> 1.0
        public var isCompleted: Bool

        public init(
            current: Int = 0,
            total: Int = 0,
            currentFileName: String = "",
            statusText: String = "",
            progress: Double = 0.0,
            isCompleted: Bool = false
        ) {
            self.current = current
            self.total = total
            self.currentFileName = currentFileName
            self.statusText = statusText
            self.progress = progress
            self.isCompleted = isCompleted
        }
    }

    public var batchId: String

    public init(batchId: String = UUID().uuidString) {
        self.batchId = batchId
    }
}
#endif
