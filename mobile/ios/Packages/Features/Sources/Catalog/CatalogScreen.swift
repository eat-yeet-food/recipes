import EatYeetAPI
import EatYeetCore
import EatYeetUI
import FeatureSupport
import SwiftUI

/// All recipes, searched on the device (the index is small and cached).
public struct CatalogScreen: View {
    @Environment(RecipeStore.self) private var store
    @State private var query = ""
    @State private var searching: Bool
    private let category: HomeCategory?
    private let zoom: Namespace.ID?
    private let open: (String) -> Void

    /// `category` narrows the list to a home Browse tile; `search` opens with the search field focused.
    public init(category: HomeCategory? = nil, search: Bool = false, zoom: Namespace.ID? = nil, open: @escaping (String) -> Void) {
        self.category = category
        _searching = State(initialValue: search)
        self.zoom = zoom
        self.open = open
    }

    public var body: some View {
        Group {
            switch store.index {
            case .loading:
                ProgressView().frame(maxWidth: .infinity, maxHeight: .infinity)
            case .failed(let message):
                LoadFailure(message: message) { await store.loadIndex() }
            case .loaded(let index, _):
                list(index)
            }
        }
        .background(Palette.background)
        .task { await store.loadIndex() }
    }

    private func list(_ index: RecipeIndex) -> some View {
        let recipes = CatalogSearch.filter(CatalogSearch.filter(index.recipes, category: category), query: query)
        return ScrollView {
            LazyVStack(alignment: .leading, spacing: 32) {
                VStack(alignment: .leading, spacing: 10) {
                    Text(category?.label ?? index.heading.title)
                        .font(Typeface.display(38, relativeTo: .largeTitle))
                        .tracking(38 * 0.02)
                        .foregroundStyle(Palette.ink)
                        .accessibilityAddTraits(.isHeader)
                    if category == nil, !index.heading.intro.isEmpty {
                        Text(index.heading.intro)
                            .font(Typeface.body(14, relativeTo: .subheadline))
                            .lineSpacing(14 * 0.625 - 3)
                            .foregroundStyle(Palette.mutedForeground)
                    }
                }
                .padding(.top, 32)
            .padding(.bottom, 0)
                if recipes.isEmpty {
                    ContentUnavailableView.search(text: query)
                }
                ForEach(recipes, id: \.slug) { recipe in
                    Button { open(recipe.slug) } label: {
                        RecipeCard(recipe: recipe, image: index.images.additionalProperties[recipe.image])
                    }
                    .buttonStyle(CardPressStyle())
                    .modifier(ZoomSource(id: recipe.slug, namespace: zoom))
                    .accessibilityIdentifier("recipe-card-\(recipe.slug)")
                }
            }
            .padding(.horizontal, 24)
            .padding(.bottom, 56)
        }
        .refreshable { await store.loadIndex() }
        .searchable(text: $query, isPresented: $searching, prompt: "Search recipes")
        .onAppear { Perf.signposter.emitEvent(Perf.launchContent) }
    }
}

public enum CatalogSearch {
    /// A Browse tile is the search it stands for (`?courses=mains`).
    public static func filter(_ recipes: [RecipeSummary], category: HomeCategory?) -> [RecipeSummary] {
        guard let category else { return recipes }
        return recipes.filter { recipe in
            switch category.facet {
            case "courses": recipe.courses.contains(category.value)
            case "methods": recipe.methods.contains(category.value)
            case "cuisines": recipe.cuisines.contains(category.value)
            case "restrictions": recipe.restrictions.contains(category.value)
            default: true
            }
        }
    }

    /// Every word must appear in the recipe's search text (the site's searchText field).
    public static func filter(_ recipes: [RecipeSummary], query: String) -> [RecipeSummary] {
        let words = query.lowercased().split(whereSeparator: \.isWhitespace)
        guard !words.isEmpty else { return recipes }
        return recipes.filter { recipe in
            let haystack = (recipe.searchText + " " + recipe.title).lowercased()
            return words.allSatisfy { haystack.contains($0) }
        }
    }
}

struct RecipeCard: View {
    let recipe: RecipeSummary
    let image: RecipeImage?

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            if let image {
                RemoteImage(variants: image.sources, aspectRatio: 1.5, alt: image.alt)
            }
            VStack(alignment: .leading, spacing: 10) {
                // Two title lines and three description lines are reserved, as on the site.
                Text(recipe.title)
                    .font(Typeface.display(18, weight: .black, relativeTo: .headline))
                    .foregroundStyle(Palette.ink)
                    .multilineTextAlignment(.leading)
                    .lineLimit(2, reservesSpace: true)
                Text(recipe.description)
                    .font(Typeface.body(14, relativeTo: .subheadline))
                    .foregroundStyle(Palette.mutedForeground)
                    .multilineTextAlignment(.leading)
                    .lineSpacing(14 * 0.625 - 3)
                    .lineLimit(3, reservesSpace: true)
                if !recipe.timeLabel.isEmpty || !recipe.yieldLabel.isEmpty {
                    Rectangle().fill(Palette.border).frame(height: 1).padding(.top, 16)
                    RecipeMeta(time: recipe.timeLabel, yield: recipe.yieldLabel).padding(.top, 6)
                }
            }
            .padding(20)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Palette.card)
        .clipShape(.rect(cornerRadius: Radius.surface))
        .contentShape(.rect)
        .accessibilityElement(children: .combine)
        .accessibilityAddTraits(.isButton)
    }
}

struct CardPressStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .scaleEffect(configuration.isPressed ? 0.98 : 1)
            .animation(.spring(duration: 0.25), value: configuration.isPressed)
    }
}

/// Marks a card as the source of the zoom transition into its recipe.
public struct ZoomSource: ViewModifier {
    let id: String
    let namespace: Namespace.ID?
    public init(id: String, namespace: Namespace.ID?) { self.id = id; self.namespace = namespace }
    public func body(content: Content) -> some View {
        if let namespace { content.matchedTransitionSource(id: id, in: namespace) } else { content }
    }
}
