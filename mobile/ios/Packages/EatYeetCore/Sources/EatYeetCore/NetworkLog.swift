import Foundation
import Observation

public struct NetworkLogEntry: Identifiable, Sendable {
    public let id = UUID()
    public let method: String
    public let url: URL
    public let status: Int?
    public let milliseconds: Int
    public let bodyPreview: String
    public let at: Date
}

/// Ring buffer of recent requests, shown in the dev menu.
@MainActor
@Observable
public final class NetworkLog {
    public static let shared = NetworkLog()
    public static let capacity = 200
    public private(set) var entries: [NetworkLogEntry] = []

    public func record(_ entry: NetworkLogEntry) {
        entries.insert(entry, at: 0)
        if entries.count > Self.capacity { entries.removeLast(entries.count - Self.capacity) }
    }

    public func clear() { entries.removeAll() }
}

/// URLSession wrapper that records every request in `NetworkLog`.
public struct HTTPClient: Sendable {
    public let session: URLSession

    public init(session: URLSession = .shared) { self.session = session }

    public func data(for request: URLRequest) async throws -> (Data, HTTPURLResponse) {
        let start = ContinuousClock.now
        do {
            let (data, response) = try await session.data(for: request)
            let http = response as? HTTPURLResponse
            await log(request, status: http?.statusCode, start: start, body: data)
            guard let http else { throw URLError(.badServerResponse) }
            return (data, http)
        } catch {
            await log(request, status: nil, start: start, body: Data(error.localizedDescription.utf8))
            throw error
        }
    }

    private func log(_ request: URLRequest, status: Int?, start: ContinuousClock.Instant, body: Data) async {
        let elapsed = ContinuousClock.now - start
        let ms = Int(elapsed.components.seconds * 1000 + elapsed.components.attoseconds / 1_000_000_000_000_000)
        let preview = String(decoding: body.prefix(512), as: UTF8.self)
        let entry = NetworkLogEntry(
            method: request.httpMethod ?? "GET", url: request.url ?? URL(string: "about:blank")!,
            status: status, milliseconds: ms, bodyPreview: preview, at: .now)
        await MainActor.run { NetworkLog.shared.record(entry) }
    }
}
