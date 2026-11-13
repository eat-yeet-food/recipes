import AlarmKit
import EatYeetCore
import EatYeetUI
import Foundation
import Observation
import SwiftUI

/// Kitchen timers as real system timers (AlarmKit): each counts down on the Lock Screen and in the
/// Dynamic Island with its label, and rings like a Clock timer when the phone is locked, silenced
/// or the app is gone. The system owns them, so they outlive the app; this mirrors the system's list.
@MainActor
@Observable
public final class KitchenTimers {
    public static let shared = KitchenTimers()

    public struct Entry: Identifiable, Equatable {
        public let id: UUID
        public let label: String
        public let recipeTitle: String?
        public let endsAt: Date
        public var alerting: Bool
    }

    /// Soonest first.
    public private(set) var entries: [Entry] = []
    /// Set when the system refuses (permission denied); shown under the timer buttons.
    public private(set) var problem: String?

    private var watching = false

    private init() {}

    /// Follows the system's alarms (timers dismissed from the Lock Screen disappear here too).
    public func watch() {
        guard !watching else { return }
        watching = true
        Task {
            sync((try? AlarmManager.shared.alarms) ?? [])
            for await alarms in AlarmManager.shared.alarmUpdates { sync(alarms) }
        }
    }

    public func start(label: String, minutes: Double, recipeTitle: String?, recipeSlug: String?) async {
        problem = nil
        do {
            if AlarmManager.shared.authorizationState != .authorized {
                guard try await AlarmManager.shared.requestAuthorization() == .authorized else {
                    problem = "Allow timers for Eat / Yeet in Settings to start one."
                    return
                }
            }
            let endsAt = Date.now.addingTimeInterval(minutes * 60)
            let metadata = CookTimerMetadata(label: label, recipeTitle: recipeTitle, recipeSlug: recipeSlug, endsAt: endsAt)
            let id = UUID()
            Self.saved[id.uuidString] = metadata
            _ = try await AlarmManager.shared.schedule(id: id, configuration: .timer(duration: minutes * 60, attributes: Self.attributes(metadata)))
            watch()
        } catch {
            problem = "The timer couldn’t start: \(error.localizedDescription)"
        }
    }

    /// Cancels a running timer, or dismisses one that is ringing.
    public func remove(_ id: UUID) {
        try? AlarmManager.shared.cancel(id: id)
        Self.saved[id.uuidString] = nil
        entries.removeAll { $0.id == id }
    }

    private func sync(_ alarms: [Alarm]) {
        var saved = Self.saved
        entries = alarms.compactMap { alarm in
            guard let meta = saved[alarm.id.uuidString] else { return nil }
            return Entry(id: alarm.id, label: meta.label, recipeTitle: meta.recipeTitle, endsAt: meta.endsAt, alerting: alarm.state == .alerting)
        }
        .sorted { $0.endsAt < $1.endsAt }
        // Forget timers the system no longer has (stopped from the Lock Screen).
        let live = Set(alarms.map(\.id.uuidString))
        saved = saved.filter { live.contains($0.key) }
        Self.saved = saved
    }

    /// Labels and end times by alarm ID. AlarmKit's `Alarm` doesn't hand metadata back to the app.
    private static var saved: [String: CookTimerMetadata] {
        get {
            guard let data = UserDefaults.standard.data(forKey: "eatyeet.timers") else { return [:] }
            return (try? JSONDecoder().decode([String: CookTimerMetadata].self, from: data)) ?? [:]
        }
        set { UserDefaults.standard.set(try? JSONEncoder().encode(newValue), forKey: "eatyeet.timers") }
    }

    private static func attributes(_ metadata: CookTimerMetadata) -> AlarmAttributes<CookTimerMetadata> {
        let title = LocalizedStringResource(stringLiteral: metadata.label)
        let presentation = AlarmPresentation(
            alert: AlarmPresentation.Alert(
                title: LocalizedStringResource(stringLiteral: "\(metadata.label) is done"),
                stopButton: AlarmButton(text: "Done", textColor: Palette.ink, systemImageName: "checkmark")),
            countdown: AlarmPresentation.Countdown(
                title: title,
                pauseButton: AlarmButton(text: "Pause", textColor: Palette.ink, systemImageName: "pause.fill")),
            paused: AlarmPresentation.Paused(
                title: LocalizedStringResource(stringLiteral: "\(metadata.label) paused"),
                resumeButton: AlarmButton(text: "Resume", textColor: Palette.ink, systemImageName: "play.fill")))
        return AlarmAttributes(presentation: presentation, metadata: metadata, tintColor: Palette.brand)
    }
}
