import EatYeetAPI
import EatYeetUI
import FeatureSupport
import SwiftUI
import UIKit

/// Where a cook is up to. Lives on the recipe screen, so closing cook mode keeps your
/// place for this visit and finishing (Back to recipe) resets it, as on the site.
@MainActor
@Observable
final class CookSession {
    enum Stage { case intro, gather, cook, done }
    struct Timer: Identifiable { let id = UUID(); let label: String; let endsAt: Date; var done = false }

    var stage: Stage = .intro
    var checked: Set<String> = []
    var folded: Set<String> = []
    var stepIndex = 0
    var timers: [Timer] = []

    func resetAll() { stage = .intro; checked = []; folded = []; stepIndex = 0; timers = [] }
}

struct CookStep: Identifiable {
    let id: String
    let section: String
    let step: Components.Schemas.Step
}

/// Full-screen, step-by-step cook mode: intro, gather (a checklist whose finished groups
/// fold away), then one step at a time with tap-to-start timers. The screen stays awake.
struct CookMode: View {
    let recipe: Components.Schemas.Recipe
    let image: RecipeImage?
    @Bindable var session: CookSession
    let close: () -> Void

    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @Environment(\.verticalSizeClass) private var verticalSize
    @State private var foldTasks: [String: Task<Void, Never>] = [:]
    @State private var tap = 0

    private var groups: [Components.Schemas.IngredientSection] {
        recipe.blocks.flatMap(\.ingredients).filter { !$0.items.isEmpty }
    }
    private var steps: [CookStep] {
        recipe.blocks.flatMap(\.steps).flatMap { section in
            section.items.map { CookStep(id: "\(section.id):\($0.id)", section: section.title, step: $0) }
        }
    }
    private var total: Int { groups.reduce(0) { $0 + $1.items.count } }
    private func key(_ section: Components.Schemas.IngredientSection, _ item: Components.Schemas.Ingredient) -> String { "\(section.id):\(item.id)" }
    private func complete(_ section: Components.Schemas.IngredientSection, _ set: Set<String>) -> Bool {
        section.items.allSatisfy { set.contains(key(section, $0)) }
    }

    var body: some View {
        VStack(spacing: 0) {
            header
            if session.stage != .intro { progress }
            switch session.stage {
            case .intro: intro
            case .gather: gather
            case .cook: cook
            case .done: done
            }
        }
        .background(Palette.background)
        .foregroundStyle(Palette.ink)
        .sensoryFeedback(.selection, trigger: tap)
        .onAppear { UIApplication.shared.isIdleTimerDisabled = true }
        .onDisappear { UIApplication.shared.isIdleTimerDisabled = false; foldTasks.values.forEach { $0.cancel() } }
        .accessibilityElement(children: .contain)
        .accessibilityLabel("Cook mode: \(recipe.title)")
    }

    // MARK: Chrome

    private var stageLabel: String {
        switch session.stage {
        case .gather: "Gather · \(session.checked.count) of \(total)"
        case .cook: "Step \(session.stepIndex + 1) of \(steps.count)"
        case .done: "Done"
        case .intro: ""
        }
    }

    private var header: some View {
        HStack {
            Eyebrow(stageLabel).lineLimit(1).monospacedDigit()
            Spacer()
            Button(action: close) {
                Image(systemName: "xmark").font(.system(size: 18, weight: .medium)).frame(width: 44, height: 44)
            }
            .accessibilityLabel("Exit cook mode")
            .accessibilityIdentifier("cook-exit")
        }
        .padding(.leading, Space.s5).padding(.trailing, Space.s2).padding(.top, Space.s2)
    }

    private var progress: some View {
        HStack(spacing: Space.s1_5) {
            if session.stage == .gather {
                GeometryReader { proxy in
                    Capsule().fill(Palette.muted).overlay(alignment: .leading) {
                        Capsule().fill(Palette.brand)
                            .frame(width: total == 0 ? 0 : proxy.size.width * CGFloat(session.checked.count) / CGFloat(total))
                    }
                }
                .animation(.easeOut(duration: 0.3), value: session.checked.count)
            } else {
                ForEach(Array(steps.indices), id: \.self) { index in
                    Capsule().fill(session.stage == .done || index <= session.stepIndex ? Palette.brand : Palette.muted)
                }
            }
        }
        .frame(height: 4)
        .padding(.horizontal, Space.s5).padding(.top, Space.s2)
        .accessibilityHidden(true)
    }

    // MARK: Intro

    private var introFacts: String {
        let facts = recipe.facts
            .filter { $0.label != "Yield" && $0.label != "Cook Time" }
            .map { "\($0.label.replacingOccurrences(of: " Time", with: "")) \($0.value)" }
        return (["\(total) ingredients", "\(steps.count) steps"] + facts).joined(separator: " · ")
    }

    private var intro: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 0) {
                if let image {
                    RemoteImage(variants: image.sources, aspectRatio: image.aspectRatio, alt: "")
                        .aspectRatio(contentMode: .fill)
                        .frame(height: 240).frame(maxWidth: .infinity).clipped()
                        .clipShape(.rect(cornerRadius: Radius.surface))
                        .padding(.bottom, Space.s6)
                        .accessibilityHidden(true)
                }
                Eyebrow("\(recipe.title) · Cook mode", color: Palette.mutedForeground)
                Text("Let’s get cooking")
                    .font(Typeface.display(.display, relativeTo: .largeTitle))
                    .padding(.top, Space.s2).padding(.bottom, Space.s6)
                    .accessibilityAddTraits(.isHeader)
                VStack(alignment: .leading, spacing: Space.s4) {
                    let items = (groups.isEmpty ? [] : [("Gather", "Lay out and measure every ingredient, checking each one off.")])
                        + [("Cook", "Follow one step at a time, with timers when you need them.")]
                    ForEach(Array(items.enumerated()), id: \.offset) { index, item in
                        HStack(alignment: .top, spacing: Space.s4) {
                            Text("\(index + 1)").font(Typeface.body(.base, weight: .bold))
                                .frame(width: 32, height: 32).background(Palette.brandSoft, in: .circle)
                                .accessibilityHidden(true)
                            VStack(alignment: .leading, spacing: Space.s0_5) {
                                Text(item.0).font(Typeface.body(.lg, weight: .bold))
                                Text(item.1).font(Typeface.body(.base)).foregroundStyle(Palette.mutedForeground)
                            }
                        }
                        .accessibilityElement(children: .combine)
                    }
                }
            }
            .padding(.horizontal, Space.s5).padding(.top, Space.s4)
        }
        .safeAreaInset(edge: .bottom) {
            VStack(spacing: Space.s4) {
                Rectangle().fill(Palette.border).frame(height: 1)
                Text(introFacts).font(Typeface.body(.bodySm, relativeTo: .subheadline))
                    .foregroundStyle(Palette.mutedForeground)
                    .frame(maxWidth: .infinity, alignment: .leading)
                primary(groups.isEmpty ? "Start cooking" : "Gather ingredients", id: "cook-begin") {
                    session.stage = groups.isEmpty ? .cook : .gather
                }
            }
            .padding(.horizontal, Space.s5).padding(.bottom, Space.s3).background(Palette.background)
        }
    }

    // MARK: Gather

    private var gather: some View {
        ScrollViewReader { reader in
            ScrollView {
                VStack(alignment: .leading, spacing: 0) {
                    Text("Gather your ingredients")
                        .font(Typeface.display(.title, relativeTo: .title))
                        .accessibilityAddTraits(.isHeader)
                        .id("top")
                    Text("Measure everything out before you start. Check each item as it’s ready.")
                        .font(Typeface.body(.lg)).foregroundStyle(Palette.mutedForeground)
                        .padding(.top, Space.s2).padding(.bottom, Space.s6)
                    VStack(alignment: .leading, spacing: Space.s4) {
                        ForEach(groups, id: \.id) { section in group(section, reader: reader) }
                    }
                    if groups.allSatisfy({ session.folded.contains($0.id) }) {
                        Text("Everything’s ready.").font(Typeface.body(.lg, weight: .semibold)).padding(.top, Space.s6)
                    }
                }
                .padding(.horizontal, Space.s5).padding(.top, Space.s4).padding(.bottom, Space.s6)
            }
        }
        .safeAreaInset(edge: .bottom) {
            primary("Start cooking", id: "cook-start") { session.stage = .cook }
                .padding(.horizontal, Space.s5).padding(.top, Space.s3).padding(.bottom, Space.s3)
                .background(Palette.background)
        }
    }

    @ViewBuilder
    private func group(_ section: Components.Schemas.IngredientSection, reader: ScrollViewProxy) -> some View {
        let isFolded = session.folded.contains(section.id)
        let done = complete(section, session.checked)
        VStack(alignment: .leading, spacing: 0) {
            Button {
                withAnimation(reduceMotion ? nil : .snappy) {
                    if isFolded { session.folded.remove(section.id) } else { session.folded.insert(section.id) }
                }
            } label: {
                HStack {
                    Eyebrow(section.title.isEmpty ? "Ingredients" : section.title)
                    Spacer()
                    if done {
                        Label("\(section.items.count) of \(section.items.count)", systemImage: "checkmark")
                            .font(Typeface.body(.caption, weight: .semibold)).monospacedDigit()
                    }
                    Image(systemName: "chevron.down").font(.system(size: 16, weight: .medium))
                        .rotationEffect(.degrees(isFolded ? 0 : 180))
                }
                .frame(minHeight: 44)
                .padding(.horizontal, isFolded ? Space.s4 : 0)
                .background(isFolded ? Palette.brandSoft : .clear, in: .rect(cornerRadius: Radius.field))
                .contentShape(.rect)
            }
            .buttonStyle(.plain)
            .accessibilityValue(isFolded ? "Collapsed" : "Expanded")

            if !isFolded {
                ForEach(section.items, id: \.id) { item in
                    let itemKey = key(section, item)
                    let on = session.checked.contains(itemKey)
                    Button { toggle(section, item, reader: reader) } label: {
                        HStack(spacing: Space.s4) {
                            RoundedRectangle(cornerRadius: 8)
                                .strokeBorder(on ? Palette.brand : Palette.ink, lineWidth: 2)
                                .background(on ? Palette.brand : .clear, in: .rect(cornerRadius: 8))
                                .overlay { if on { Image(systemName: "checkmark").font(.system(size: 14, weight: .heavy)) } }
                                .frame(width: 28, height: 28)
                            ingredientText(item)
                                .font(Typeface.body(.lg))
                                .strikethrough(on, color: Palette.ink)
                                .foregroundStyle(on ? Palette.mutedForeground : Palette.ink)
                                .frame(maxWidth: .infinity, alignment: .leading)
                        }
                        .padding(.vertical, Space.s2_5).frame(minHeight: 48).contentShape(.rect)
                    }
                    .buttonStyle(.plain)
                    .id(itemKey)
                    .accessibilityIdentifier("cook-item-\(itemKey)")
                    .accessibilityAddTraits(on ? [.isSelected] : [])
                    .accessibilityHint("Checks this ingredient off")
                    .overlay(alignment: .bottom) { Rectangle().fill(Palette.border).frame(height: 1) }
                }
            }
        }
    }

    private func ingredientText(_ item: Components.Schemas.Ingredient) -> Text {
        (item.amount.isEmpty ? Text("") : Text(item.amount + " ").bold()) + Text(InlineHTML.attributed(item.html))
    }

    private func toggle(_ section: Components.Schemas.IngredientSection, _ item: Components.Schemas.Ingredient, reader: ScrollViewProxy) {
        tap += 1
        let itemKey = key(section, item)
        if session.checked.contains(itemKey) { session.checked.remove(itemKey) } else { session.checked.insert(itemKey) }
        foldTasks[section.id]?.cancel()
        foldTasks[section.id] = nil
        if complete(section, session.checked) {
            // Wait a second before folding, so a mistaken tap can be undone.
            foldTasks[section.id] = Task {
                try? await Task.sleep(for: .seconds(1))
                guard !Task.isCancelled else { return }
                withAnimation(reduceMotion ? nil : .snappy) {
                    session.folded.insert(section.id)
                    reader.scrollTo("top", anchor: .top)
                }
            }
            return
        }
        if let next = section.items.first(where: { !session.checked.contains(key(section, $0)) }) {
            withAnimation(reduceMotion ? nil : .default) { reader.scrollTo(key(section, next), anchor: .center) }
        }
    }

    // MARK: Cook

    @ViewBuilder
    private var cook: some View {
        if session.stepIndex < steps.count {
            let current = steps[session.stepIndex]
            HStack(alignment: .top, spacing: Space.s10) {
                ScrollView {
                    VStack(alignment: .leading, spacing: 0) {
                        if !current.section.isEmpty {
                            Eyebrow(current.section, color: Palette.mutedForeground).padding(.bottom, Space.s2_5)
                        }
                        Text(InlineHTML.attributed(current.step.html))
                            .font(Typeface.body(.titleSm, weight: .semibold, relativeTo: .title2))
                            .lineSpacing(4)
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .accessibilityIdentifier("cook-step")
                        if !current.step.needs.isEmpty { needs(current.step.needs) }
                        if !current.step.timers.isEmpty {
                            FlowRow(spacing: Space.s3) {
                                ForEach(current.step.timers, id: \.label) { timer in
                                    Button { startTimer(timer) } label: {
                                        Label("Start \(timer.label) timer", systemImage: "timer")
                                    }
                                    .buttonStyle(UtilityButtonStyle())
                                }
                            }
                            .padding(.top, Space.s6)
                        }
                    }
                    .padding(.top, Space.s6)
                }
                .id(current.id)
                .transition(.opacity)
                if verticalSize == .compact, !groups.isEmpty { ingredientAside(current) }
            }
            .padding(.horizontal, Space.s5)
            .contentShape(.rect)
            .gesture(DragGesture(minimumDistance: 30).onEnded { value in
                let dx = value.translation.width
                guard abs(dx) > 50, abs(dx) > abs(value.translation.height) else { return }
                if dx < 0 { next() } else { previous() }
            })
            .safeAreaInset(edge: .bottom) { cookFooter }
        }
    }

    private func needs(_ needs: [Components.Schemas.Need]) -> some View {
        VStack(alignment: .leading, spacing: 0) {
            Eyebrow("You’ll need", color: Palette.mutedForeground).padding(.bottom, Space.s1)
            ForEach(Array(needs.enumerated()), id: \.element.key) { index, need in
                ((need.amount.isEmpty ? Text("") : Text(need.amount + " ").bold()) + Text(InlineHTML.attributed(need.name)))
                    .font(Typeface.body(.lg))
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(.vertical, Space.s2)
                    .overlay(alignment: .top) { if index > 0 { Rectangle().fill(Palette.border).frame(height: 1) } }
            }
        }
        .padding(.horizontal, Space.s5).padding(.vertical, Space.s4)
        .background(Palette.muted, in: .rect(cornerRadius: Radius.surface))
        .padding(.top, Space.s6)
        .accessibilityElement(children: .contain)
        .accessibilityLabel("You’ll need")
    }

    private func ingredientAside(_ current: CookStep) -> some View {
        ScrollView {
            VStack(alignment: .leading, spacing: Space.s5) {
                ForEach(groups, id: \.id) { section in
                    VStack(alignment: .leading, spacing: 0) {
                        Eyebrow(section.title.isEmpty ? "Ingredients" : section.title).padding(.bottom, Space.s1)
                        ForEach(section.items, id: \.id) { item in
                            let used = current.step.needs.contains { $0.key == item.id }
                            ingredientText(item)
                                .font(Typeface.body(.bodySm, weight: used ? .semibold : .regular))
                                .frame(maxWidth: .infinity, alignment: .leading)
                                .padding(.vertical, Space.s2).padding(.horizontal, used ? 8 : 0)
                                .background(used ? Palette.brandSoft : .clear, in: .rect(cornerRadius: 8))
                                .padding(.horizontal, used ? -Space.s2 : 0)
                        }
                    }
                }
            }
            .padding(Space.s6)
        }
        .frame(maxWidth: 280)
        .background(Palette.muted, in: .rect(cornerRadius: Radius.surface))
        .padding(.top, Space.s6)
        .accessibilityLabel("Ingredients")
    }

    private var cookFooter: some View {
        VStack(spacing: Space.s3) {
            if !session.timers.isEmpty {
                TimelineView(.periodic(from: .now, by: 1)) { context in
                    FlowRow(spacing: Space.s2) {
                        ForEach(session.timers) { timer in timerChip(timer, now: context.date) }
                    }
                    .onChange(of: context.date) { _, now in finishTimers(at: now) }
                }
            }
            HStack {
                Button(action: previous) { Label("Back", systemImage: "arrow.left") }
                    .buttonStyle(UtilityButtonStyle(large: true))
                    .accessibilityLabel(session.stepIndex == 0 && !groups.isEmpty ? "Back to ingredients" : "Previous step")
                Spacer()
                primary(session.stepIndex == steps.count - 1 ? "Finish" : "Next", id: "cook-next", expand: false, action: next)
            }
        }
        .padding(.horizontal, Space.s5).padding(.top, Space.s3).padding(.bottom, Space.s3)
        .background(Palette.background)
    }

    private func timerChip(_ timer: CookSession.Timer, now: Date) -> some View {
        let left = Self.clock(timer.endsAt.timeIntervalSince(now))
        return Button { session.timers.removeAll { $0.id == timer.id } } label: {
            HStack(spacing: Space.s1_5) {
                Image(systemName: "timer")
                Text(timer.label)
                Text(timer.done ? "Done!" : left).monospacedDigit()
                Image(systemName: "xmark")
            }
            .font(Typeface.body(.bodySm, weight: .semibold))
            .foregroundStyle(timer.done ? Palette.ink : Palette.onDarkLabel)
            .padding(.horizontal, Space.s4).frame(minHeight: 40)
            .background(timer.done ? Palette.brand : Palette.ink, in: .capsule)
            .symbolEffect(.pulse, isActive: timer.done && !reduceMotion)
        }
        .buttonStyle(.plain)
        .accessibilityLabel(timer.done ? "\(timer.label) timer done, dismiss" : "\(timer.label) timer, \(left) left, cancel")
    }

    private func startTimer(_ timer: Components.Schemas.StepTimer) {
        tap += 1
        session.timers.append(.init(label: timer.label, endsAt: .now.addingTimeInterval(timer.minutes * 60)))
    }

    private func finishTimers(at now: Date) {
        for index in session.timers.indices where !session.timers[index].done && session.timers[index].endsAt <= now {
            session.timers[index].done = true
            UINotificationFeedbackGenerator().notificationOccurred(.warning)
        }
    }

    static func clock(_ interval: TimeInterval) -> String {
        let total = max(0, Int(interval.rounded(.up)))
        let h = total / 3600, m = (total % 3600) / 60, s = total % 60
        return h > 0 ? String(format: "%d:%02d:%02d", h, m, s) : String(format: "%d:%02d", m, s)
    }

    private func next() {
        guard session.stage == .cook else { return }
        tap += 1
        withAnimation(reduceMotion ? nil : .easeOut(duration: 0.2)) {
            if session.stepIndex < steps.count - 1 { session.stepIndex += 1 } else { session.stage = .done }
        }
    }

    private func previous() {
        if session.stage == .done { session.stage = .cook; return }
        guard session.stage == .cook else { return }
        withAnimation(reduceMotion ? nil : .easeOut(duration: 0.2)) {
            if session.stepIndex > 0 { tap += 1; session.stepIndex -= 1 } else if !groups.isEmpty { session.stage = .gather }
        }
    }

    // MARK: Done

    private var done: some View {
        VStack(spacing: Space.s6) {
            Text("That’s a wrap.").font(Typeface.display(.display, relativeTo: .largeTitle))
            Text("Enjoy your \(recipe.title).").font(Typeface.body(.lg))
            HStack(spacing: Space.s3) {
                Button(action: previous) { Label("Back", systemImage: "arrow.left") }
                    .buttonStyle(UtilityButtonStyle(large: true))
                Button("Back to recipe") { session.resetAll(); close() }
                    .buttonStyle(PrimaryButtonStyle())
                    .accessibilityIdentifier("cook-finish")
            }
        }
        .multilineTextAlignment(.center)
        .padding(.horizontal, Space.s5)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    // MARK: Shared

    private func primary(_ title: String, id: String, expand: Bool = true, action: @escaping () -> Void) -> some View {
        Button { tap += 1; action() } label: {
            HStack(spacing: Space.s2) { Text(title); Image(systemName: "arrow.right") }
                .frame(maxWidth: expand ? .infinity : nil)
        }
        .buttonStyle(PrimaryButtonStyle(large: true))
        .accessibilityIdentifier(id)
    }
}

/// The site's outlined utility button.
struct UtilityButtonStyle: ButtonStyle {
    var large = false
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(Typeface.action(large ? .lg : .bodySm))
            .foregroundStyle(Palette.ink)
            .padding(.horizontal, large ? Space.s6 : Space.s4)
            .frame(minHeight: large ? 52 : 44)
            .background(configuration.isPressed ? Palette.tint : Palette.background, in: .capsule)
            .overlay { Capsule().strokeBorder(Palette.ink, lineWidth: 1.5) }
    }
}

/// Wraps children onto new lines (timer buttons and chips).
struct FlowRow: Layout {
    var spacing: CGFloat = 8
    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
        let rows = arrange(width: proposal.width ?? .infinity, subviews: subviews)
        return CGSize(width: proposal.width ?? rows.width, height: rows.height)
    }
    func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
        var x = bounds.minX, y = bounds.minY, line: CGFloat = 0
        for view in subviews {
            let size = view.sizeThatFits(.unspecified)
            if x > bounds.minX, x + size.width > bounds.maxX { x = bounds.minX; y += line + spacing; line = 0 }
            view.place(at: CGPoint(x: x, y: y), proposal: .unspecified)
            x += size.width + spacing; line = max(line, size.height)
        }
    }
    private func arrange(width: CGFloat, subviews: Subviews) -> (width: CGFloat, height: CGFloat) {
        var x: CGFloat = 0, y: CGFloat = 0, line: CGFloat = 0, widest: CGFloat = 0
        for view in subviews {
            let size = view.sizeThatFits(.unspecified)
            if x > 0, x + size.width > width { y += line + spacing; x = 0; line = 0 }
            x += size.width + spacing; line = max(line, size.height); widest = max(widest, x - spacing)
        }
        return (widest, y + line)
    }
}
