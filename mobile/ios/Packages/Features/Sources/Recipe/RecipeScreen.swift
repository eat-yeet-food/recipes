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
        .navigationBarTitleDisplayMode(.inline)
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
    @Binding var count: Int
    let cook: () -> Void

    private var recipe: Components.Schemas.Recipe { detail.recipe }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 0) {
                RecipeHeader(recipe: recipe, image: detail.images.additionalProperties[recipe.image], cook: cook) {
                    RecipePrinter.print(slug: recipe.slug, title: recipe.title, count: detail.batch?.count, base: environment.backend.baseURL)
                }

                VStack(alignment: .leading, spacing: 0) {
                    if let batch = detail.batch {
                        BatchCard(count: $count, noun: batch.noun, plural: batch.plural)
                            .padding(.bottom, 24)
                    }
                    ForEach(Array(recipe.blocks.enumerated()), id: \.offset) { _, block in
                        VStack(alignment: .leading, spacing: 40) {
                            if !block.ingredients.isEmpty { IngredientsCard(sections: block.ingredients) }
                            if !block.steps.isEmpty { StepsView(sections: block.steps) }
                            if !block.equipment.isEmpty { ListSection(title: "Equipment", sections: block.equipment) }
                            if !block.notes.isEmpty { FlatSection(title: "Notes", items: block.notes) }
                            if !block.tips.isEmpty { FlatSection(title: "Tips", items: block.tips) }
                        }
                    }
                    RatingsSection(slug: recipe.slug).padding(.top, 48)
                }
                .padding(.horizontal, 18)
                .padding(.top, 24)
                .padding(.bottom, 30)
            }
        }
        .background(Palette.background)
    }
}

/// The plum band: title, byline, cook-mode action, description and facts, with the
/// photo inset below, overlapping the band's lower edge (the site's recipe hero).
struct RecipeHeader: View {
    let recipe: Components.Schemas.Recipe
    let image: RecipeImage?
    let cook: () -> Void
    let print: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            VStack(alignment: .leading, spacing: 0) {
                Text(recipe.title)
                    .font(Typeface.display(38, relativeTo: .largeTitle))
                    .tracking(38 * 0.02)
                    .lineSpacing(-4)
                    .foregroundStyle(.white)
                    .accessibilityAddTraits(.isHeader)
                    .accessibilityIdentifier("recipe-title")
                HStack(alignment: .center) {
                    Text("BY PATRICK HOGAN")
                        .font(Typeface.body(11, weight: .bold, relativeTo: .caption2))
                        .tracking(11 * 0.16)
                        .foregroundStyle(Palette.brand)
                    Spacer()
                    HStack(spacing: 8) {
                        RoundIconAction(.printer, label: "Print Recipe", action: print)
                            .accessibilityIdentifier("print-recipe")
                        RoundIconAction(.chefHat, label: "Cooking view", action: cook)
                            .accessibilityIdentifier("start-cooking")
                    }
                }
                .padding(.top, 6)
                .padding(.bottom, 24)
                if !recipe.description.isEmpty {
                    Text(recipe.description)
                        .font(Typeface.body(16))
                        .lineSpacing(16 * 0.625 - 4)
                        .foregroundStyle(Palette.onDarkLabel)
                }
                RecipeFactsGrid(facts: facts).padding(.top, 24)
            }
            .padding(.horizontal, 18)
            .padding(.top, 24)
            .padding(.bottom, image == nil ? 32 : 24)

            if let image {
                RemoteImage(variants: image.sources, aspectRatio: image.aspectRatio, alt: image.alt)
                    .clipShape(.rect(cornerRadius: Radius.surface))
                    .shadow(color: Palette.ink.opacity(0.22), radius: 28, y: 24)
                    .padding(.horizontal, 18)
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
        LazyVGrid(columns: [GridItem(.flexible(), spacing: 24, alignment: .leading), GridItem(.flexible(), alignment: .leading)], alignment: .leading, spacing: 12) {
            ForEach(facts, id: \.0) { label, value in
                VStack(alignment: .leading, spacing: 2) {
                    Text(label.uppercased())
                        .font(Typeface.body(11, weight: .bold, relativeTo: .caption2))
                        .tracking(11 * 0.16)
                        .foregroundStyle(Palette.brand)
                    Text(value)
                        .font(Typeface.body(18, weight: .semibold, relativeTo: .headline))
                        .monospacedDigit()
                        .foregroundStyle(.white)
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
        HStack(spacing: 16) {
            Text("Makes \(count) \(noun)")
                .font(Typeface.body(15, weight: .bold, relativeTo: .subheadline))
                .foregroundStyle(Palette.ink)
                .contentTransition(.numericText(value: Double(count)))
            Spacer(minLength: 0)
            HStack(spacing: 0) {
                segment("minus", label: "Fewer \(plural)", enabled: count > 1) { count -= 1 }
                Rectangle().fill(Palette.border).frame(width: 1, height: 22)
                Text("\(count)")
                    .font(Typeface.body(16, weight: .bold))
                    .monospacedDigit()
                    .foregroundStyle(Palette.ink)
                    .frame(minWidth: 40)
                    .contentTransition(.numericText(value: Double(count)))
                    .accessibilityHidden(true)
                Rectangle().fill(Palette.border).frame(width: 1, height: 22)
                segment("plus", label: "More \(plural)", enabled: count < 99) { count += 1 }
            }
            .overlay { Capsule().stroke(Palette.ink, lineWidth: 1) }
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
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
                .font(.system(size: 15, weight: .regular))
                .frame(width: 44, height: 40)
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
        VStack(alignment: .leading, spacing: 4) {
            Text("Ingredients")
                .font(Typeface.display(34, relativeTo: .title))
                .foregroundStyle(.white)
                .accessibilityAddTraits(.isHeader)
                .padding(.bottom, 8)
            ForEach(sections, id: \.id) { section in
                if !section.title.isEmpty {
                    SectionLabel(section.title, color: Palette.brand).padding(.top, 16).padding(.bottom, 4)
                }
                ForEach(section.items, id: \.id) { item in
                    VStack(spacing: 0) {
                        Rectangle().fill(.white.opacity(0.15)).frame(height: 1)
                        (Text(item.amount.isEmpty ? "" : item.amount + " ").bold().foregroundColor(Palette.brand)
                            + Text(InlineHTML.attributed(item.html, linkColor: Palette.onDarkLabel)))
                            .font(Typeface.body(16))
                            .foregroundStyle(.white)
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .padding(.vertical, 9)
                    }
                }
            }
        }
        .padding(24)
        .background(Palette.ink, in: .rect(cornerRadius: Radius.surface))
    }
}

struct StepsView: View {
    let sections: [Components.Schemas.StepSection]

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Instructions")
                .font(Typeface.display(34, relativeTo: .title))
                .foregroundStyle(Palette.ink)
                .accessibilityAddTraits(.isHeader)
            ForEach(sections, id: \.id) { section in
                VStack(alignment: .leading, spacing: 12) {
                    if !section.title.isEmpty { SectionLabel(section.title).padding(.top, 22) }
                    if let origin = section.timeOrigin {
                        Text(origin).font(Typeface.body(13, relativeTo: .caption)).foregroundStyle(Palette.mutedForeground)
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
                HStack(alignment: .top, spacing: 14) {
                    Text(step.time ?? "")
                        .font(Typeface.body(12, weight: .bold, relativeTo: .caption))
                        .monospacedDigit()
                        .foregroundStyle(Palette.brand)
                        .lineLimit(1)
                        .minimumScaleFactor(0.7)
                        .frame(minWidth: 40, minHeight: 40)
                        .padding(.horizontal, 2)
                        .background(Palette.ink, in: .capsule)
                        .accessibilityLabel(step.time.map { "At \($0)" } ?? "")
                    VStack(alignment: .leading, spacing: 2) {
                        HTMLText(step.html).font(Typeface.body(16)).foregroundStyle(Palette.ink).lineSpacing(16 * 0.72 - 4)
                        if let rest = step.rest {
                            Text(rest).font(Typeface.body(14, relativeTo: .subheadline)).foregroundStyle(Palette.mutedForeground)
                        }
                    }
                    .padding(.top, 8)
                    .padding(.bottom, 18)
                }
                .background(alignment: .topLeading) {
                    if index < steps.count - 1 {
                        Rectangle().fill(Palette.ink).frame(width: 2).padding(.top, 20).offset(x: 21)
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
        VStack(alignment: .leading, spacing: 18) {
            ForEach(Array(steps.enumerated()), id: \.element.id) { index, step in
                VStack(alignment: .leading, spacing: 4) {
                    Text("STEP \(index + 1)")
                        .font(Typeface.body(14, weight: .bold, relativeTo: .subheadline))
                        .tracking(14 * 0.16)
                        .foregroundStyle(Palette.ink)
                    HTMLText(step.html).font(Typeface.body(16)).foregroundStyle(Palette.ink).lineSpacing(16 * 0.72 - 4)
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
        VStack(alignment: .leading, spacing: 10) {
            Text(title).font(Typeface.display(34, relativeTo: .title)).foregroundStyle(Palette.ink).accessibilityAddTraits(.isHeader)
            ForEach(sections, id: \.id) { section in
                if !section.title.isEmpty { SectionLabel(section.title).padding(.top, 8) }
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
        VStack(alignment: .leading, spacing: 10) {
            Text(title).font(Typeface.display(34, relativeTo: .title)).foregroundStyle(Palette.ink).accessibilityAddTraits(.isHeader)
            ForEach(Array(items.enumerated()), id: \.offset) { _, html in Bullet(html: html) }
        }
    }
}

struct Bullet: View {
    let html: String
    var body: some View {
        HStack(alignment: .firstTextBaseline, spacing: 10) {
            Text("•").font(Typeface.body(16, weight: .heavy)).foregroundStyle(Palette.ink).accessibilityHidden(true)
            HTMLText(html).font(Typeface.body(16)).foregroundStyle(Palette.ink).lineSpacing(16 * 0.72 - 4)
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
            .font(Typeface.display(13, relativeTo: .caption))
            .foregroundStyle(color)
            .accessibilityAddTraits(.isHeader)
    }
}
