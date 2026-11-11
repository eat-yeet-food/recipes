import Foundation
import Observation

/// Developer toggles, persisted in UserDefaults.
@MainActor
@Observable
public final class FeatureFlags {
    private let defaults: UserDefaults

    public var showSafeAreas: Bool { didSet { save("safeAreas", showSafeAreas) } }
    public var showGrid: Bool { didSet { save("grid", showGrid) } }

    public init(defaults: UserDefaults = .standard) {
        self.defaults = defaults
        showSafeAreas = defaults.bool(forKey: "eatyeet.flag.safeAreas")
        showGrid = defaults.bool(forKey: "eatyeet.flag.grid")
    }

    private func save(_ key: String, _ value: Bool) { defaults.set(value, forKey: "eatyeet.flag.\(key)") }
}
