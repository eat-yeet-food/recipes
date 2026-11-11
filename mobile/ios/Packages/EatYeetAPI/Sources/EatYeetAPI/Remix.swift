import EatYeetCore
import Foundation

/// Any JSON value. Remix keeps a calculator's opaque state as JSON: the app edits the fields it
/// knows and carries everything else through untouched; the server validates and calculates.
public enum JSONValue: Codable, Equatable, Hashable, Sendable {
    case null, bool(Bool), number(Double), string(String), array([JSONValue]), object([String: JSONValue])

    public init(from decoder: Decoder) throws {
        let c = try decoder.singleValueContainer()
        if c.decodeNil() { self = .null }
        else if let v = try? c.decode(Bool.self) { self = .bool(v) }
        else if let v = try? c.decode(Double.self) { self = .number(v) }
        else if let v = try? c.decode(String.self) { self = .string(v) }
        else if let v = try? c.decode([JSONValue].self) { self = .array(v) }
        else { self = .object(try c.decode([String: JSONValue].self)) }
    }
    public func encode(to encoder: Encoder) throws {
        var c = encoder.singleValueContainer()
        switch self {
        case .null: try c.encodeNil()
        case .bool(let v): try c.encode(v)
        case .number(let v): if v.rounded() == v, abs(v) < 1e15 { try c.encode(Int64(v)) } else { try c.encode(v) }
        case .string(let v): try c.encode(v)
        case .array(let v): try c.encode(v)
        case .object(let v): try c.encode(v)
        }
    }

    public subscript(key: String) -> JSONValue? {
        get { if case .object(let o) = self { o[key] } else { nil } }
        set { if case .object(var o) = self { o[key] = newValue; self = .object(o) } }
    }
    public subscript(index: Int) -> JSONValue? {
        get { if case .array(let a) = self, a.indices.contains(index) { a[index] } else { nil } }
        set { if case .array(var a) = self, a.indices.contains(index), let newValue { a[index] = newValue; self = .array(a) } }
    }
    public var number: Double? { if case .number(let v) = self { v } else { nil } }
    public var string: String? { if case .string(let v) = self { v } else { nil } }
    public var array: [JSONValue]? { if case .array(let v) = self { v } else { nil } }

    /// Read or write a nested value, e.g. `state[path: "formula", "hydrationPercent"]`.
    public subscript(path keys: String...) -> JSONValue? {
        get { keys.reduce(Optional(self)) { $0?[$1] } }
        set { self = Self.set(self, keys[...], newValue) }
    }
    private static func set(_ value: JSONValue, _ keys: ArraySlice<String>, _ newValue: JSONValue?) -> JSONValue {
        guard let key = keys.first, case .object(var o) = value else { return newValue ?? value }
        o[key] = keys.count == 1 ? newValue : set(o[key] ?? .object([:]), keys.dropFirst(), newValue)
        return .object(o)
    }
}

public typealias RemixIndex = Components.Schemas.RemixIndex
public typealias RemixResolution = Components.Schemas.RemixResolution

/// A remixable recipe and the editor's choices; `defaultState` is the recipe as written.
public struct RemixRecipe: Decodable, Sendable {
    public struct Method: Decodable, Sendable, Hashable { public let id: String; public let label: String }
    public let slug: String
    public let title: String
    public let image: String
    public let family: String
    public let label: String
    public let defaultState: JSONValue
    public let methods: [Method]
    public struct PizzaSize: Decodable, Sendable, Hashable { public let inches: Double; public let ballGrams: Double }
    public let pizzaSizes: [PizzaSize]
    public let images: [String: Components.Schemas.Image]
}

/// The public, stateless Remix calls (`/api/public/app/v1/remix`).
public struct RemixAPI: Sendable {
    let base: URL
    public init(base: URL) { self.base = base.appending(path: "api/public/app/v1/remix") }

    private func get<T: Decodable>(_ url: URL) async throws -> T {
        var request = URLRequest(url: url)
        request.cachePolicy = .reloadIgnoringLocalCacheData
        let (data, response) = try await URLSession.shared.data(for: request)
        guard (response as? HTTPURLResponse)?.statusCode == 200 else { throw AppAPIError.unexpected(status: (response as? HTTPURLResponse)?.statusCode ?? 0) }
        return try JSONDecoder().decode(T.self, from: data)
    }

    public func index() async throws -> RemixIndex { try await get(base) }
    public func recipe(_ slug: String) async throws -> RemixRecipe { try await get(base.appending(path: slug)) }

    public func resolve(_ slug: String, state: JSONValue) async throws -> RemixResolution {
        var request = URLRequest(url: base.appending(path: slug).appending(path: "resolve"))
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try JSONEncoder().encode(["state": state])
        let (data, response) = try await URLSession.shared.data(for: request)
        guard (response as? HTTPURLResponse)?.statusCode == 200 else { throw AppAPIError.unexpected(status: (response as? HTTPURLResponse)?.statusCode ?? 0) }
        return try JSONDecoder().decode(RemixResolution.self, from: data)
    }
}

/// A member's saved remix (`/api/public/account/kitchen/formulas`).
public struct KitchenFormula: Decodable, Sendable, Identifiable, Equatable {
    public let id: String
    public let name: String
    public let recipeSlug: String
    public let family: String
    public let state: JSONValue
    public let revision: Int
    public let updatedAt: String
    public let deletedAt: String?
    public let notes: String?
}

public struct KitchenList: Decodable, Sendable {
    public let formulas: [KitchenFormula]
    public let deleted: [KitchenFormula]
}

public enum KitchenSaveError: Error, Equatable { case conflict(String), failed(String) }

extension AccountStore {
    private func kitchen<T: Decodable>(_ path: String, method: String = "GET", json: [String: any Sendable]? = nil, fallback: String) async throws -> T {
        let (data, code) = json == nil && method == "GET" ? try await request("/kitchen/formulas\(path)") : try await requestJSON("/kitchen/formulas\(path)", method: method, json: json ?? [:])
        if code == 409, message(data, fallback: "").contains("another tab") { throw KitchenSaveError.conflict("This remix changed on another device. Reload to see the latest version.") }
        guard (200..<300).contains(code), let value = try? JSONDecoder().decode(T.self, from: data) else {
            throw KitchenSaveError.failed(message(data, fallback: fallback))
        }
        return value
    }

    private static func object(_ state: JSONValue) -> any Sendable {
        (try? JSONSerialization.jsonObject(with: JSONEncoder().encode(state))) as? [String: any Sendable] ?? [:]
    }

    public func listRemixes() async throws -> KitchenList { try await kitchen("", fallback: "Remix is unavailable. Please try again.") }
    public func readRemix(_ id: String) async throws -> KitchenFormula { try await kitchen("/\(id)", fallback: "This remix could not be found.") }

    public func createRemix(recipeSlug: String, name: String, state: JSONValue) async throws -> KitchenFormula {
        try await kitchen("", method: "POST", json: ["recipeSlug": recipeSlug, "name": name, "notes": "", "state": Self.object(state)], fallback: "Your remix could not be saved. Please try again.")
    }

    /// Saves with the revision the edit started from; a newer revision on the server is a conflict, never overwritten.
    public func saveRemix(_ formula: KitchenFormula, name: String, state: JSONValue) async throws -> KitchenFormula {
        try await kitchen("/\(formula.id)", method: "PATCH", json: ["baseRevision": formula.revision, "name": name, "notes": formula.notes ?? "", "state": Self.object(state)], fallback: "Your remix could not be saved. Please try again.")
    }

    public func duplicateRemix(_ id: String, name: String) async throws -> KitchenFormula {
        try await kitchen("/\(id)/duplicate", method: "POST", json: ["name": name], fallback: "Your remix could not be duplicated. Please try again.")
    }

    public func deleteRemix(_ id: String) async throws -> KitchenFormula {
        try await kitchen("/\(id)", method: "DELETE", json: [:], fallback: "Your remix could not be deleted. Please try again.")
    }

    public func undeleteRemix(_ id: String) async throws -> KitchenFormula {
        try await kitchen("/\(id)/undelete", method: "POST", json: [:], fallback: "Your remix could not be restored. Please try again.")
    }

    public func purgeRemix(_ id: String) async throws {
        let (data, code) = try await requestJSON("/kitchen/formulas/\(id)/purge", method: "POST", json: [:])
        guard (200..<300).contains(code) else { throw KitchenSaveError.failed(message(data, fallback: "Your remix could not be deleted. Please try again.")) }
    }
}
