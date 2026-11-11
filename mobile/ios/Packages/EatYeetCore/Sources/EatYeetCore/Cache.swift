import Foundation

/// On-disk JSON cache under Caches/eatyeet.
public enum DiskCache {
    public static var directory: URL {
        URL.cachesDirectory.appending(path: "eatyeet", directoryHint: .isDirectory)
    }

    public static func clear() throws {
        let fm = FileManager.default
        if fm.fileExists(atPath: directory.path()) { try fm.removeItem(at: directory) }
        URLCache.shared.removeAllCachedResponses()
    }
}
