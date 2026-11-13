import ActivityKit
import AlarmKit
import EatYeetCore
import EatYeetUI
import SwiftUI
import WidgetKit

/// The Lock Screen and Dynamic Island face of a kitchen timer (AlarmKit draws the alert itself).
struct TimerLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: AlarmAttributes<CookTimerMetadata>.self) { context in
            HStack(spacing: Space.s3) {
                Image(systemName: "timer").font(Typeface.icon(IconSize.lg, weight: .semibold)).foregroundStyle(Palette.brand)
                VStack(alignment: .leading, spacing: Space.s0_5) {
                    Text(context.attributes.metadata?.label ?? "Timer").font(Typeface.body(.base, weight: .bold))
                    if let recipe = context.attributes.metadata?.recipeTitle {
                        Text(recipe).font(Typeface.body(.sm)).foregroundStyle(Palette.onDarkMuted)
                    }
                }
                Spacer()
                remaining(context.state).font(Typeface.body(.title, weight: .bold)).monospacedDigit().foregroundStyle(Palette.brand)
            }
            .foregroundStyle(Palette.onDarkLabel)
            .padding(Space.s4)
            .activityBackgroundTint(Palette.ink)
            .activitySystemActionForegroundColor(Palette.brand)
        } dynamicIsland: { context in
            DynamicIsland {
                DynamicIslandExpandedRegion(.leading) {
                    Image(systemName: "timer").font(Typeface.icon(IconSize.lg, weight: .semibold)).foregroundStyle(Palette.brand)
                }
                DynamicIslandExpandedRegion(.center) {
                    Text(context.attributes.metadata?.label ?? "Timer").font(Typeface.body(.base, weight: .bold)).lineLimit(1)
                }
                DynamicIslandExpandedRegion(.trailing) {
                    remaining(context.state).font(Typeface.body(.lg, weight: .bold)).monospacedDigit().foregroundStyle(Palette.brand)
                }
            } compactLeading: {
                Image(systemName: "timer").foregroundStyle(Palette.brand)
            } compactTrailing: {
                remaining(context.state).monospacedDigit().foregroundStyle(Palette.brand).frame(maxWidth: Measure.timeColumn)
            } minimal: {
                Image(systemName: "timer").foregroundStyle(Palette.brand)
            }
        }
    }

    @ViewBuilder
    private func remaining(_ state: AlarmPresentationState) -> some View {
        switch state.mode {
        case .countdown(let countdown):
            Text(timerInterval: Date.now...countdown.fireDate, countsDown: true)
        case .paused(let paused):
            Text(Duration.seconds(paused.totalCountdownDuration - paused.previouslyElapsedDuration).formatted(.time(pattern: .minuteSecond)))
        default:
            Text("Done")
        }
    }
}

@main
struct EatYeetTimers: WidgetBundle {
    var body: some Widget { TimerLiveActivity() }
}
