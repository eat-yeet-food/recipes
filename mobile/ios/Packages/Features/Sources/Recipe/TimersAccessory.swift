import EatYeetUI
import SwiftUI

/// The app-wide timers bar, floating above the tab bar on every screen while any timer exists: the next
/// timer counting down (pink once one is done) and how many more. Tapping it lists every timer
/// with Cancel / Dismiss, wherever you are in the app.
public struct TimersAccessory: View {
    @State private var timers = KitchenTimers.shared
    let open: () -> Void

    /// `open` shows the full list (presented by the app's root view).
    public init(open: @escaping () -> Void) { self.open = open }

    public var body: some View {
        Button(action: open) {
            TimelineView(.periodic(from: .now, by: 1)) { context in
                let done = timers.entries.filter { $0.alerting || $0.endsAt <= context.date }
                let next = timers.entries.first { !$0.alerting && $0.endsAt > context.date }
                HStack(spacing: Space.s2) {
                    Image(systemName: "timer").font(Typeface.icon(IconSize.sm, weight: .semibold))
                    if let first = done.first {
                        Text("\(first.label) is done").lineLimit(1)
                    } else if let next {
                        Text(next.label).lineLimit(1)
                    }
                    Spacer(minLength: Space.s2)
                    if done.isEmpty, let next {
                        Text(Self.clock(next.endsAt.timeIntervalSince(context.date))).monospacedDigit()
                    }
                    if timers.entries.count > 1 {
                        Text("+\(timers.entries.count - 1)").font(Typeface.body(.xs, weight: .bold))
                    }
                }
                .font(Typeface.body(.sm, weight: .bold))
                .foregroundStyle(done.isEmpty ? Palette.ink : Palette.brand)
                .padding(.horizontal, Space.s4)
                .frame(minHeight: Control.regular)
                .background(.regularMaterial, in: .capsule)
                .elevation(.raised)
                .contentShape(.capsule)
            }
        }
        .buttonStyle(.plain)
        .padding(.horizontal, Space.s4)
        .padding(.bottom, Space.s2)
        .accessibilityLabel(summary)
        .accessibilityHint("Shows every timer")
        .accessibilityIdentifier("timers-bar")
        .task { timers.watch() }
    }

    /// For VoiceOver: what the bar shows, in words.
    private var summary: String {
        let now = Date.now
        if let done = timers.entries.first(where: { $0.alerting || $0.endsAt <= now }) { return "Timers: \(done.label) is done" }
        guard let next = timers.entries.first else { return "Timers" }
        return "Timers: \(timers.entries.count). Next, \(next.label), \(Self.clock(next.endsAt.timeIntervalSince(now))) left"
    }

    static func clock(_ interval: TimeInterval) -> String {
        let total = max(0, Int(interval.rounded(.up)))
        let h = total / 3600, m = (total % 3600) / 60, s = total % 60
        return h > 0 ? String(format: "%d:%02d:%02d", h, m, s) : String(format: "%d:%02d", m, s)
    }
}

/// Every running or ringing timer, soonest first, each with Cancel (or Dismiss once done).
public struct TimersSheet: View {
    @State private var timers = KitchenTimers.shared
    @Environment(\.dismiss) private var dismiss

    public init() {}

    public var body: some View {
        NavigationStack {
            TimelineView(.periodic(from: .now, by: 1)) { context in
                List {
                    ForEach(timers.entries) { timer in
                        let done = timer.alerting || timer.endsAt <= context.date
                        HStack(spacing: Space.s3) {
                            VStack(alignment: .leading, spacing: Space.s0_5) {
                                Text(timer.label).font(Typeface.body(.base, weight: .bold))
                                if let recipe = timer.recipeTitle {
                                    Text(recipe).font(Typeface.body(.sm)).foregroundStyle(Palette.mutedForeground)
                                }
                            }
                            Spacer()
                            Text(done ? "Done" : TimersAccessory.clock(timer.endsAt.timeIntervalSince(context.date)))
                                .font(Typeface.body(.lg, weight: .bold)).monospacedDigit()
                                .foregroundStyle(done ? Palette.brand : Palette.ink)
                            Button { timers.remove(timer.id) } label: {
                                Image(systemName: "xmark").font(Typeface.icon(IconSize.sm, weight: .semibold))
                                    .frame(width: Space.target, height: Space.target)
                                    .background(Palette.muted, in: .circle)
                            }
                            .buttonStyle(.plain)
                            .accessibilityLabel(done ? "Dismiss \(timer.label)" : "Cancel \(timer.label)")
                        }
                        .listRowBackground(Palette.background)
                    }
                }
                .listStyle(.plain)
                .overlay {
                    if timers.entries.isEmpty {
                        Text("No timers running.").font(Typeface.body(.base)).foregroundStyle(Palette.mutedForeground)
                    }
                }
            }
            .navigationTitle("Timers")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar { ToolbarItem(placement: .topBarTrailing) { Button("Done") { dismiss() } } }
        }
        .presentationDetents([.medium, .large])
        .foregroundStyle(Palette.ink)
    }
}
