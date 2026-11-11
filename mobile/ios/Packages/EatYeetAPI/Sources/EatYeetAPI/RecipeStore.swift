import EatYeetCore
import Foundation
import Observation

/// Loading state for one resource: cached value first, then the network's.
public enum Loadable<Value: Sendable>: Sendable {
    case loading
    case loaded(Value, stale: Bool)
    case failed(String)

    public var value: Value? {
        if case .loaded(let value, _) = self { return value }
        return nil
    }
}

/// Recipes for the current backend, cached on disk (stale-while-revalidate).
@MainActor
@Observable
public final class RecipeStore {
    public private(set) var home: Loadable<Components.Schemas.Home> = .loading
    public private(set) var index: Loadable<RecipeIndex> = .loading
    public private(set) var details: [String: Loadable<RecipeDetail>] = [:]
    private var api: AppAPI
    private var cache: JSONDiskCache
    private var backend: BackendEnvironment

    public init(backend: BackendEnvironment) {
        self.backend = backend
        api = AppAPI(base: backend.baseURL)
        cache = JSONDiskCache(backend: backend)
    }

    /// Switch backends (dev menu); clears in-memory state.
    public func use(_ backend: BackendEnvironment) {
        guard backend != self.backend else { return }
        self.backend = backend
        api = AppAPI(base: backend.baseURL)
        cache = JSONDiskCache(backend: backend)
        index = .loading
        home = .loading
        details = [:]
    }

    public func loadHome() async {
        if home.value == nil, let cached = cache.read(Components.Schemas.Home.self, key: "home") { home = .loaded(cached, stale: true) }
        do {
            let fresh = try await api.home()
            cache.write(fresh, key: "home")
            home = .loaded(fresh, stale: false)
        } catch {
            if home.value == nil { home = .failed(Self.describe(error)) }
        }
    }

    public func loadIndex() async {
        if index.value == nil, let cached = cache.read(RecipeIndex.self, key: "index") { index = .loaded(cached, stale: true) }
        do {
            let fresh = try await api.recipes()
            cache.write(fresh, key: "index")
            index = .loaded(fresh, stale: false)
        } catch {
            if index.value == nil { index = .failed(Self.describe(error)) }
        }
    }

    public func loadRecipe(_ slug: String, count: Int = 1) async {
        let key = Self.key(slug, count)
        if details[key]?.value == nil {
            if let cached = cache.read(RecipeDetail.self, key: "recipe-\(key)") { details[key] = .loaded(cached, stale: true) }
            else { details[key] = .loading }
        }
        do {
            let fresh = try await api.recipe(slug: slug, count: count)
            cache.write(fresh, key: "recipe-\(key)")
            details[key] = .loaded(fresh, stale: false)
        } catch {
            if details[key]?.value == nil { details[key] = .failed(Self.describe(error)) }
        }
    }

    public func recipe(_ slug: String, count: Int = 1) -> Loadable<RecipeDetail> {
        details[Self.key(slug, count)] ?? .loading
    }

    static func key(_ slug: String, _ count: Int) -> String { "\(slug)-\(count)" }

    static func describe(_ error: Error) -> String {
        if error as? AppAPIError == .notFound { return "This recipe isn’t available." }
        return "Couldn’t reach Eat / Yeet. Check your connection and try again."
    }
}
