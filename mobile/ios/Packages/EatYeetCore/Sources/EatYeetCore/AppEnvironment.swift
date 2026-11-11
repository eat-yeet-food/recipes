import Foundation
import Observation

/// Which backend the app talks to.
public enum BackendEnvironment: String, CaseIterable, Sendable, Identifiable {
    case production
    case local

    public var id: String { rawValue }
    public var label: String { self == .production ? "Production" : "Local (this Mac)" }
    public var baseURL: URL {
        switch self {
        case .production: URL(string: "https://eatyeet.com")!
        // Tooling may pass `-localOrigin http://127.0.0.1:<port>` when 3000 is taken.
        case .local: UserDefaults.standard.string(forKey: "localOrigin").flatMap(URL.init(string:))
            ?? URL(string: "http://127.0.0.1:3000")!
        }
    }

    public static var platformDefault: BackendEnvironment {
        #if targetEnvironment(simulator)
        .local
        #else
        .production
        #endif
    }
}

@MainActor
@Observable
public final class AppEnvironment {
    private static let key = "eatyeet.environment"
    private let defaults: UserDefaults

    public var backend: BackendEnvironment {
        didSet { defaults.set(backend.rawValue, forKey: Self.key) }
    }

    public init(defaults: UserDefaults = .standard) {
        self.defaults = defaults
        backend = defaults.string(forKey: Self.key).flatMap(BackendEnvironment.init) ?? .platformDefault
    }
}
