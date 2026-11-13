import EatYeetAPI
import EatYeetCore
import EatYeetUI
import FeatureSupport
import SwiftUI

/// A recipe as written, projected by the server for today's count.
public struct RecipeScreen: View {
    @Environment(RecipeStore.self) private var store
    let slug: String
    @State private var count = 1
    @State private var cooking: Bool
    @State private var session = CookSession()
    /// The last loaded detail stays on screen while a new count loads (no flash).
    @State private var shown: RecipeDetail?

    /// `cooking` opens cook mode straight away (the eatyeet://open/cook/<slug> link).
    public init(slug: String, cooking: Bool = false) {
        self.slug = slug
        _cooking = State(initialValue: cooking)
    }

    public var body: some View {
        Group {
            if let detail = shown ?? store.recipe(slug, count: count).value {
                RecipeContent(detail: detail, count: $count) { cooking = true }
                    .fullScreenCover(isPresented: $cooking) {
                        CookMode(recipe: detail.recipe, image: detail.images.additionalProperties[detail.recipe.image], session: session) { cooking = false }
                    }
            } else if case .failed(let message) = store.recipe(slug, count: count) {
                LoadFailure(message: message) { await store.loadRecipe(slug, count: count) }
            } else {
                ProgressView().frame(maxWidth: .infinity, maxHeight: .infinity)
            }
        }
        .background(Palette.background)
        // No navigation bar: Back is part of the plum header, so the page is one piece that hands
        // back to its card (RecipeHero) or pops.
        .toolbar(.hidden, for: .navigationBar)
        .task(id: count) {
            let state = Perf.signposter.beginInterval(Perf.recipeInteractive)
            await store.loadRecipe(slug, count: count)
            if let value = store.recipe(slug, count: count).value { shown = value }
            Perf.signposter.endInterval(Perf.recipeInteractive, state)
        }
    }
}

struct RecipeContent: View {
    @Environment(AppEnvironment.self) private var environment
    let detail: RecipeDetail
    @Environment(\.dismiss) private var dismiss
    @Environment(RecipeHero.self) private var hero: RecipeHero?
    @Binding var count: Int
    let cook: () -> Void

    private var recipe: Components.Schemas.Recipe { detail.recipe }

    var body: some View {
        // The scroll view runs up under the status and nav bars and the header pads itself back down,
        // so the plum band fills the top as part of the page (and shrinks back into its card with it).
        GeometryReader { outer in
        ScrollView {
            VStack(alignment: .leading, spacing: 0) {
                RecipeHeader(recipe: recipe, image: detail.images.additionalProperties[recipe.image], topInset: outer.safeAreaInsets.top, back: { if hero?.opening != nil { hero?.close() } else { dismiss() } }, cook: cook) {
                    RecipePrinter.print(slug: recipe.slug, title: recipe.title, count: detail.batch?.count, base: environment.backend.baseURL)
                }

                VStack(alignment: .leading, spacing: 0) {
                    if let batch = detail.batch {
                        BatchCard(count: $count, noun: batch.noun, plural: batch.plural)
                            .padding(.bottom, Space.s6)
                    }
                    ForEach(Array(recipe.blocks.enumerated()), id: \.offset) { _, block in
                        VStack(alignment: .leading, spacing: Space.s10) {
                            if !block.ingredients.isEmpty { IngredientsCard(sections: block.ingredients) }
                            if !block.steps.isEmpty { StepsView(sections: block.steps) }
                            if !block.equipment.isEmpty { ListSection(title: "Equipment", sections: block.equipment) }
                            if !block.notes.isEmpty { FlatSection(title: "Notes", items: block.notes) }
                            if !block.tips.isEmpty { FlatSection(title: "Tips", items: block.tips) }
                        }
                    }
                    RatingsSection(slug: recipe.slug).padding(.top, Space.s12)
                }
                .padding(.horizontal, Space.s4)
                .padding(.top, Space.s6)
                .padding(.bottom, Space.s8)
            }
        }
        .ignoresSafeArea(edges: .top)
        .background(Palette.background)
        }
    }
}

/// The plum band: title, byline, cook-mode action, description and facts, with the
/// photo inset below, overlapping the band's lower edge (the site's recipe hero).
struct RecipeHeader: View {
    let recipe: Components.Schemas.Recipe
    let image: RecipeImage?
    /// The status bar's height: the band starts under it, its content below it.
    var topInset: CGFloat = 0
    let back: () -> Void
    let cook: () -> Void
    let print: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            VStack(alignment: .leading, spacing: 0) {
                RoundIconAction(.arrowLeft, label: "Back", action: back)
                    .padding(.top, topInset)
                    .padding(.bottom, Space.s6)
                Text(recipe.title)
                    .font(Typeface.display(.page, relativeTo: .largeTitle))
                    .tracking(Tracking.title(.page))
                    .lineSpacing(Leading.solid)
                    .foregroundStyle(Palette.white)
                    .accessibilityAddTraits(.isHeader)
                    .accessibilityIdentifier("recipe-title")
                HStack(alignment: .center) {
                    Text("BY PATRICK HOGAN")
                        .font(Typeface.body(.micro, weight: .bold, relativeTo: .caption2))
                        .tracking(Tracking.eyebrow(.micro))
                        .foregroundStyle(Palette.brand)
                    Spacer()
                    HStack(spacing: Space.s2) {
                        RoundIconAction(.printer, label: "Print Recipe", action: print)
                            .accessibilityIdentifier("print-recipe")
                        RoundIconAction(.chefHat, label: "Cooking view", action: cook)
                            .accessibilityIdentifier("start-cooking")
                    }
                }
                .padding(.top, Space.s1_5)
                .padding(.bottom, Space.s6)
                if !recipe.description.isEmpty {
                    Text(recipe.description)
                        .font(Typeface.body(.base))
                        .lineSpacing(Leading.snug(.base))
                        .foregroundStyle(Palette.onDarkLabel)
                }
                RecipeFactsGrid(facts: facts).padding(.top, Space.s6)
            }
            .padding(.horizontal, Space.s4)
            .padding(.top, Space.s6)
            .padding(.bottom, image == nil ? Space.s8 : Space.s6)

            if let image {
                RemoteImage(variants: image.sources, aspectRatio: image.aspectRatio, alt: image.alt)
                    .clipShape(.rect(cornerRadius: Radius.surface))
                    .recipeHeroDestination()
                    .elevation(.overlay)
                    .padding(.horizontal, Space.s4)
            }
        }
        // Plum stops min(32vw, 300) above the photo's bottom edge, as on the site.
        .background(alignment: .top) {
            GeometryReader { proxy in
                let overlap = image == nil ? 0 : min(proxy.size.width * 0.32, 300)
                Palette.ink.frame(height: max(0, proxy.size.height - overlap))
                    .ignoresSafeArea(edges: .top)
            }
        }
    }

    private var facts: [(String, String)] { recipe.facts.map { ($0.label, $0.value) } }
}

/// Pink eyebrow labels over white values, two columns (the site's on-dark RecipeFacts).
struct RecipeFactsGrid: View {
    let facts: [(String, String)]

    var body: some View {
        LazyVGrid(columns: [GridItem(.flexible(), spacing: Space.s6, alignment: .leading), GridItem(.flexible(), alignment: .leading)], alignment: .leading, spacing: Space.s3) {
            ForEach(facts, id: \.0) { label, value in
                VStack(alignment: .leading, spacing: Space.s0_5) {
                    Text(label.uppercased())
                        .font(Typeface.body(.micro, weight: .bold, relativeTo: .caption2))
                        .tracking(Tracking.eyebrow(.micro))
                        .foregroundStyle(Palette.brand)
                    Text(value)
                        .font(Typeface.body(.lg, weight: .semibold, relativeTo: .headline))
                        .monospacedDigit()
                        .foregroundStyle(Palette.white)
                }
                .accessibilityElement(children: .combine)
            }
        }
    }
}

/// "Makes 1 loaf" with a pill stepper (the site's TodayBatch + CountStepper).
struct BatchCard: View {
    @Binding var count: Int
    let noun: String
    let plural: String

    var body: some View {
        HStack(spacing: Space.s4) {
            Text("Makes \(count) \(noun)")
                .font(Typeface.body(.bodySm, weight: .bold, relativeTo: .subheadline))
                .foregroundStyle(Palette.ink)
                .contentTransition(.numericText(value: Double(count)))
            Spacer(minLength: 0)
            HStack(spacing: 0) {
                segment("minus", label: "Fewer \(plural)", enabled: count > 1) { count -= 1 }
                Rectangle().fill(Palette.border).frame(width: Stroke.hairline, height: Measure.stepperDivider)
                Text("\(count)")
                    .font(Typeface.body(.base, weight: .bold))
                    .monospacedDigit()
                    .foregroundStyle(Palette.ink)
                    .frame(minWidth: Control.compact)
                    .contentTransition(.numericText(value: Double(count)))
                    .accessibilityHidden(true)
                Rectangle().fill(Palette.border).frame(width: Stroke.hairline, height: Measure.stepperDivider)
                segment("plus", label: "More \(plural)", enabled: count < 99) { count += 1 }
            }
            .overlay { Capsule().stroke(Palette.ink, lineWidth: Stroke.hairline) }
        }
        .padding(.horizontal, Space.s4)
        .padding(.vertical, Space.s3)
        .background(Palette.card, in: .rect(cornerRadius: Radius.field))
        .overlay { RoundedRectangle(cornerRadius: Radius.field).stroke(Palette.border) }
        .sensoryFeedback(.selection, trigger: count)
        .animation(.snappy, value: count)
        .accessibilityElement(children: .contain)
        .accessibilityLabel("How many \(plural)")
        .accessibilityValue("\(count)")
        .accessibilityAdjustableAction { direction in
            switch direction {
            case .increment: if count < 99 { count += 1 }
            case .decrement: if count > 1 { count -= 1 }
            @unknown default: break
            }
        }
    }

    private func segment(_ icon: String, label: String, enabled: Bool, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Image(systemName: icon)
                .font(Typeface.icon(IconSize.sm, weight: .regular))
                .frame(width: Space.target, height: Control.compact)
                .background(enabled ? .clear : Palette.muted, in: .capsule)
        }
        .foregroundStyle(enabled ? Palette.ink : Palette.mutedForeground)
        .disabled(!enabled)
        .accessibilityLabel(label)
    }
}

/// Plum card with bold pink amounts (the site's on-dark ingredient list).
struct IngredientsCard: View {
    let sections: [Components.Schemas.IngredientSection]

    var body: some View {
        VStack(alignment: .leading, spacing: Space.s1) {
            Text("Ingredients")
                .font(Typeface.display(.section, relativeTo: .title))
                .foregroundStyle(Palette.white)
                .accessibilityAddTraits(.isHeader)
                .padding(.bottom, Space.s2)
            ForEach(sections, id: \.id) { section in
                if !section.title.isEmpty {
                    SectionLabel(section.title, color: Palette.brand).padding(.top, Space.s4).padding(.bottom, Space.s1)
                }
                ForEach(section.items, id: \.id) { item in
                    VStack(spacing: 0) {
                        Rectangle().fill(Palette.borderOnDark).frame(height: Stroke.hairline)
                        (Text(item.amount.isEmpty ? "" : item.amount + " ").font(Typeface.body(.base, weight: .bold)).foregroundColor(Palette.brand)
                            + Text(InlineHTML.attributed(item.html, linkColor: Palette.onDarkLabel, boldFont: Typeface.body(.base, weight: .bold))))
                            .font(Typeface.body(.base))
                            .foregroundStyle(Palette.white)
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .padding(.vertical, Space.s2)
                    }
                }
            }
        }
        .padding(Space.s6)
        .background(Palette.ink, in: .rect(cornerRadius: Radius.surface))
    }
}

struct StepsView: View {
    let sections: [Components.Schemas.StepSection]

    var body: some View {
        VStack(alignment: .leading, spacing: Space.s2) {
            Text("Instructions")
                .font(Typeface.display(.section, relativeTo: .title))
                .foregroundStyle(Palette.ink)
                .accessibilityAddTraits(.isHeader)
            ForEach(sections, id: \.id) { section in
                VStack(alignment: .leading, spacing: Space.s3) {
                    if !section.title.isEmpty { SectionLabel(section.title).padding(.top, Space.s6) }
                    if let origin = section.timeOrigin {
                        Text(origin).font(Typeface.body(.caption, relativeTo: .caption)).foregroundStyle(Palette.mutedForeground)
                    }
                    if section.timed { TimedRail(steps: section.items) } else { NumberedSteps(steps: section.items) }
                }
            }
        }
    }
}

/// Timed process steps: plum badges carrying the elapsed time, joined by a line.
struct TimedRail: View {
    let steps: [Components.Schemas.Step]

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            ForEach(Array(steps.enumerated()), id: \.element.id) { index, step in
                HStack(alignment: .top, spacing: Space.s3_5) {
                    Text(step.time ?? "")
                        .font(Typeface.body(.xs, weight: .bold, relativeTo: .caption))
                        .monospacedDigit()
                        .foregroundStyle(Palette.brand)
                        .lineLimit(1)
                        .minimumScaleFactor(0.7)
                        .frame(minWidth: Control.compact, minHeight: Control.compact)
                        .padding(.horizontal, Space.s0_5)
                        .background(Palette.ink, in: .capsule)
                        .accessibilityLabel(step.time.map { "At \($0)" } ?? "")
                    VStack(alignment: .leading, spacing: Space.s0_5) {
                        HTMLText(step.html, size: .base).foregroundStyle(Palette.ink).lineSpacing(Leading.prose(.base))
                        if let rest = step.rest {
                            Text(rest).font(Typeface.body(.sm, relativeTo: .subheadline)).foregroundStyle(Palette.mutedForeground)
                        }
                    }
                    .padding(.top, Space.s2)
                    .padding(.bottom, Space.s4)
                }
                .background(alignment: .topLeading) {
                    if index < steps.count - 1 {
                        Rectangle().fill(Palette.ink).frame(width: Stroke.rule).padding(.top, Space.s5).offset(x: Measure.railInset)
                    }
                }
                .accessibilityElement(children: .combine)
            }
        }
    }
}

/// Numbered steps: a "Step n" eyebrow above each, so order never looks like the timeline.
struct NumberedSteps: View {
    let steps: [Components.Schemas.Step]

    var body: some View {
        VStack(alignment: .leading, spacing: Space.s4) {
            ForEach(Array(steps.enumerated()), id: \.element.id) { index, step in
                VStack(alignment: .leading, spacing: Space.s1) {
                    Text("STEP \(index + 1)")
                        .font(Typeface.body(.sm, weight: .bold, relativeTo: .subheadline))
                        .tracking(Tracking.eyebrow(.sm))
                        .foregroundStyle(Palette.ink)
                    HTMLText(step.html, size: .base).foregroundStyle(Palette.ink).lineSpacing(Leading.prose(.base))
                }
                .accessibilityElement(children: .combine)
            }
        }
    }
}

struct ListSection: View {
    let title: String
    let sections: [Components.Schemas.Section]

    var body: some View {
        VStack(alignment: .leading, spacing: Space.s2_5) {
            Text(title).font(Typeface.display(.section, relativeTo: .title)).foregroundStyle(Palette.ink).accessibilityAddTraits(.isHeader)
            ForEach(sections, id: \.id) { section in
                if !section.title.isEmpty { SectionLabel(section.title).padding(.top, Space.s2) }
                ForEach(section.items, id: \.id) { item in
                    Bullet(html: item.html)
                }
            }
        }
    }
}

struct FlatSection: View {
    let title: String
    let items: [String]

    var body: some View {
        VStack(alignment: .leading, spacing: Space.s2_5) {
            Text(title).font(Typeface.display(.section, relativeTo: .title)).foregroundStyle(Palette.ink).accessibilityAddTraits(.isHeader)
            ForEach(Array(items.enumerated()), id: \.offset) { _, html in Bullet(html: html) }
        }
    }
}

struct Bullet: View {
    let html: String
    var body: some View {
        HStack(alignment: .firstTextBaseline, spacing: Space.s2_5) {
            Text("•").font(Typeface.body(.base, weight: .bold)).foregroundStyle(Palette.ink).accessibilityHidden(true)
            HTMLText(html, size: .base).foregroundStyle(Palette.ink).lineSpacing(Leading.prose(.base))
        }
    }
}

/// A recipe section name (`h3`): Geller bold capitals with no tracking (site-overrides.css).
struct SectionLabel: View {
    let text: String
    let color: Color
    init(_ text: String, color: Color = Palette.ink) { self.text = text; self.color = color }
    var body: some View {
        Text(text.uppercased())
            .font(Typeface.display(.caption, relativeTo: .caption))
            .foregroundStyle(color)
            .accessibilityAddTraits(.isHeader)
    }
}
