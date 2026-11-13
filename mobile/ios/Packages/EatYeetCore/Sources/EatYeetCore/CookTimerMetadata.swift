import AlarmKit
import Foundation

/// What a kitchen timer is for, carried by its system alarm: the app's timer list and the
/// Lock Screen / Dynamic Island countdown (the EatYeetTimers widget) both read it.
public struct CookTimerMetadata: AlarmMetadata {
    /// The step's lead and duration, e.g. "Simmer · 20 min".
    public var label: String
    public var recipeTitle: String?
    public var recipeSlug: String?
    /// When the countdown ends; AlarmKit's own state carries it too, but only while counting.
    public var endsAt: Date

    public init(label: String, recipeTitle: String? = nil, recipeSlug: String? = nil, endsAt: Date) {
        self.label = label
        self.recipeTitle = recipeTitle
        self.recipeSlug = recipeSlug
        self.endsAt = endsAt
    }
}
