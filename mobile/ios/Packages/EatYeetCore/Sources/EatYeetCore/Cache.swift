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

/// Codable values on disk, keyed by backend + path. Used to show stale data, then revalidate,
/// and to keep cook mode working offline.
public struct JSONDiskCache: Sendable {
    public let namespace: String

    public init(backend: BackendEnvironment) { namespace = backend.rawValue }

    private func file(_ key: String) -> URL {
        let safe = key.map { $0.isLetter || $0.isNumber || $0 == "-" ? $0 : "_" }
        return DiskCache.directory.appending(path: namespace).appending(path: String(safe) + ".json")
    }

    public func read<T: Decodable>(_ type: T.Type, key: String) -> T? {
        guard let data = try? Data(contentsOf: file(key)) else { return nil }
        return try? JSONDecoder().decode(type, from: data)
    }

    public func write<T: Encodable>(_ value: T, key: String) {
        let url = file(key)
        try? FileManager.default.createDirectory(at: url.deletingLastPathComponent(), withIntermediateDirectories: true)
        if let data = try? JSONEncoder().encode(value) { try? data.write(to: url, options: .atomic) }
    }
}
