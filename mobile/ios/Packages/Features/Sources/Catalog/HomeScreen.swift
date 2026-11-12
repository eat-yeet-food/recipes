import EatYeetAPI
import EatYeetCore
import EatYeetUI
import FeatureSupport
import SwiftUI

public typealias HomeCategory = Components.Schemas.Category

/// Where the home screen sends people; the app's router maps these to routes.
public enum HomeDestination {
    case recipe(String)
    case catalog(HomeCategory?)
    case search
    case path(String)
    case account
    case signOut
    /// A site page the app doesn't have (Privacy, Terms), opened in the browser.
    case web(String)
}

/// The site's home page: the plum hero over the donut photo, What's New and Browse by Category.
public struct HomeScreen: View {
    @Environment(RecipeStore.self) private var store
    @State private var menuOpen = false
    private let zoom: Namespace.ID?
    private let go: (HomeDestination) -> Void

    public init(zoom: Namespace.ID? = nil, go: @escaping (HomeDestination) -> Void) {
        self.zoom = zoom
        self.go = go
    }

    public var body: some View {
        Group {
            switch store.home {
            case .loading: ProgressView().frame(maxWidth: .infinity, maxHeight: .infinity)
            case .failed(let message): LoadFailure(message: message) { await store.loadHome() }
            case .loaded(let home, _): content(home)
            }
        }
        .background(Palette.background)
        .toolbar { SiteNavBar(home: store.home.value, menuOpen: $menuOpen, go: go) }
        .overlay(alignment: .top) {
            // Clipped to the content area, so the panel slides out from under the bar and back.
            VStack(spacing: 0) {
                if menuOpen {
                    SiteMenu(links: store.home.value?.navigation ?? []) { destination in
                        withAnimation(.snappy(duration: 0.2)) { menuOpen = false }
                        go(destination)
                    }
                    .transition(.move(edge: .top))
                }
            }
            .frame(maxWidth: .infinity, alignment: .top)
            .clipped()
        }
        .task { await store.loadHome() }
    }

    private func content(_ home: Components.Schemas.Home) -> some View {
        ScrollView {
            VStack(spacing: 0) {
                HomeHero(hero: home.hero, image: home.images.additionalProperties[home.hero.image], go: go)

                SectionHeading(eyebrow: home.latest.eyebrow, title: home.latest.title).padding(.top, Space.s20)
                LazyVStack(spacing: Space.s8) {
                    ForEach(home.latest.recipes, id: \.slug) { recipe in
                        Button { go(.recipe(recipe.slug)) } label: {
                            RecipeCard(recipe: recipe, image: home.images.additionalProperties[recipe.image])
                        }
                        .buttonStyle(CardPressStyle())
                        .modifier(ZoomSource(id: recipe.slug, namespace: zoom))
                        .accessibilityIdentifier("recipe-card-\(recipe.slug)")
                    }
                }
                .padding(.horizontal, Space.s8)
                ViewAllLink(label: "View all recipes") { go(.catalog(nil)) }.padding(.top, Space.s10)

                SectionHeading(eyebrow: home.browse.eyebrow, title: home.browse.title).padding(.top, Space.s16)
                LazyVGrid(columns: [GridItem(.flexible(), spacing: Space.s3), GridItem(.flexible(), spacing: Space.s3)], spacing: Space.s3) {
                    ForEach(home.browse.categories, id: \.slug) { category in
                        Button { go(.catalog(category)) } label: {
                            BrowseTile(category: category, image: home.images.additionalProperties[category.image])
                        }
                        .buttonStyle(CardPressStyle())
                    }
                }
                .padding(.horizontal, Space.s8)
                .padding(.bottom, Space.s16)
                SiteFooter(wordmark: home.wordmark, go: go)
            }
        }
        .refreshable { await store.loadHome() }
        .onAppear { Perf.signposter.emitEvent(Perf.launchContent) }
    }
}

// MARK: Nav bar

/// The site header as a native bar: the wordmark, then search and the menu.
struct SiteNavBar: ToolbarContent {
    let home: Components.Schemas.Home?
    @Binding var menuOpen: Bool
    let go: (HomeDestination) -> Void

    var body: some ToolbarContent {
        ToolbarItem(placement: .topBarLeading) {
            Wordmark(first: home?.wordmark.first ?? "Eat", second: home?.wordmark.second ?? "Yeet")
                .accessibilityLabel("\(home?.wordmark.first ?? "Eat") / \(home?.wordmark.second ?? "Yeet"), home")
        }
        .sharedBackgroundVisibility(.hidden)
        ToolbarItem(placement: .topBarTrailing) {
            Button { go(.search) } label: { SiteIcon.search.image }
                .accessibilityLabel("Search")
        }
        .sharedBackgroundVisibility(.hidden)
        ToolbarItem(placement: .topBarTrailing) {
            Button { withAnimation(.snappy(duration: 0.2)) { menuOpen.toggle() } } label: {
                SiteIcon.menu.image
                    .frame(width: 44, height: 44)
                    .background(menuOpen ? Palette.muted : .clear, in: .circle)
            }
            .accessibilityLabel(menuOpen ? "Close menu" : "Open menu")
        }
        .sharedBackgroundVisibility(.hidden)
    }
}

/// The site's phone menu: a white panel under the header with bold rows, then the account rows.
struct SiteMenu: View {
    @Environment(AccountStore.self) private var account
    let links: [Components.Schemas.NavLink]
    let go: (HomeDestination) -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: Space.s1) {
            ForEach(links, id: \.href) { link in row(link.label) { go(.path(link.href)) } }
            if let member = account.member {
                row("Settings") { go(.account) }
                row("Sign out") { go(.signOut) }
                HStack(spacing: Space.s2) {
                    Text(String(member.displayName.first ?? "C").uppercased())
                        .font(Typeface.body(.xs, weight: .bold)).frame(width: 32, height: 32)
                        .background(Palette.brandSoft, in: .circle)
                    Text(member.displayName).font(Typeface.body(.sm, weight: .bold)).lineLimit(1)
                }
                .padding(.horizontal, Space.s2).frame(minHeight: 44)
            } else {
                row("Sign in") { go(.account) }
            }
        }
        .foregroundStyle(Palette.ink)
        .padding(.horizontal, Space.s4).padding(.vertical, Space.s3)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Palette.background)
        .overlay(alignment: .top) { Rectangle().fill(Palette.border).frame(height: 1) }
        .overlay(alignment: .bottom) { Rectangle().fill(Palette.border).frame(height: 1) }
    }

    private func row(_ label: String, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Text(label).font(Typeface.body(.sm, weight: .bold))
                .padding(.horizontal, Space.s2).frame(maxWidth: .infinity, minHeight: 44, alignment: .leading)
                .contentShape(.rect)
        }
        .buttonStyle(.plain)
    }
}

/// The site footer: the wordmark, the links and the copyright line.
struct SiteFooter: View {
    let wordmark: Components.Schemas.Home.WordmarkPayload
    let go: (HomeDestination) -> Void
    private let links: [(String, HomeDestination)] = [("Home", .path("/")), ("Recipes", .path("/search")), ("Remix", .path("/remix")),
        ("Privacy", .web("/privacy")), ("Terms", .web("/terms"))]

    var body: some View {
        VStack(spacing: Space.s4) {
            Wordmark(first: wordmark.first, second: wordmark.second, size: .title)
            HStack(spacing: Space.s6) {
                ForEach(links, id: \.0) { label, destination in
                    Button(label) { go(destination) }
                        .font(Typeface.body(.sm, weight: .bold)).foregroundStyle(Palette.ink)
                        .frame(minHeight: 44)
                }
            }
            Text("© \(String(Calendar.current.component(.year, from: .now))) \(wordmark.first) / \(wordmark.second). All rights reserved.")
                .font(Typeface.body(.micro)).tracking(Tracking.eyebrow(.micro)).foregroundStyle(Palette.mutedForeground)
        }
        .padding(.vertical, Space.s9).padding(.horizontal, Space.s8)
        .frame(maxWidth: .infinity)
        .overlay(alignment: .top) { Rectangle().fill(Palette.border).frame(height: 1) }
    }
}

/// EAT • YEET: the second word in pink→orange lettering on a tilted plum sticker with an orange peel.
public struct Wordmark: View {
    let first: String
    let second: String
    var size: TextSize = .lg
    public init(first: String, second: String, size: TextSize = .lg) { self.first = first; self.second = second; self.size = size }
    public var body: some View {
        HStack(spacing: Space.s2) {
            Text(first.uppercased()).foregroundStyle(Palette.ink)
            Circle().fill(Palette.mutedForeground).frame(width: 4, height: 4)
            Text(second.uppercased())
                .foregroundStyle(LinearGradient(colors: [Palette.brand, Palette.brandAlt], startPoint: .leading, endPoint: .trailing))
                .padding(.horizontal, Space.s2).padding(.vertical, Space.s1)
                .background(StickerShape().fill(Palette.ink))
                .background(StickerShape().fill(Palette.brandAlt).offset(x: size.rawValue * 0.07, y: size.rawValue * 0.09))
                .rotationEffect(.degrees(-4))
        }
        .font(Typeface.hero(size, relativeTo: .title3))
        .fixedSize()
    }
}

/// The site's `rounded-[40%_35%_40%_25%]` blob.
struct StickerShape: Shape {
    func path(in rect: CGRect) -> Path {
        let w = rect.width, h = rect.height
        func r(_ p: CGFloat) -> (CGFloat, CGFloat) { (min(w * p, w / 2), min(h * p, h / 2)) }
        let (tl, tr, br, bl) = (r(0.40), r(0.35), r(0.40), r(0.25))
        var path = Path()
        path.move(to: CGPoint(x: rect.minX + tl.0, y: rect.minY))
        path.addLine(to: CGPoint(x: rect.maxX - tr.0, y: rect.minY))
        path.addQuadCurve(to: CGPoint(x: rect.maxX, y: rect.minY + tr.1), control: CGPoint(x: rect.maxX, y: rect.minY))
        path.addLine(to: CGPoint(x: rect.maxX, y: rect.maxY - br.1))
        path.addQuadCurve(to: CGPoint(x: rect.maxX - br.0, y: rect.maxY), control: CGPoint(x: rect.maxX, y: rect.maxY))
        path.addLine(to: CGPoint(x: rect.minX + bl.0, y: rect.maxY))
        path.addQuadCurve(to: CGPoint(x: rect.minX, y: rect.maxY - bl.1), control: CGPoint(x: rect.minX, y: rect.maxY))
        path.addLine(to: CGPoint(x: rect.minX, y: rect.minY + tl.1))
        path.addQuadCurve(to: CGPoint(x: rect.minX + tl.0, y: rect.minY), control: CGPoint(x: rect.minX, y: rect.minY))
        return path
    }
}

// MARK: Hero

struct HomeHero: View {
    let hero: Components.Schemas.Home.HeroPayload
    let image: RecipeImage?
    let go: (HomeDestination) -> Void

    static let gradient = LinearGradient(stops: [
        .init(color: Palette.plum950, location: 0), .init(color: Palette.ink, location: 0.45), .init(color: Palette.plum800, location: 0.65),
        .init(color: Palette.plum600, location: 0.85), .init(color: Palette.plum400, location: 1),
    ], startPoint: .leading, endPoint: .trailing)

    var body: some View {
        VStack(spacing: 0) {
            // A fixed 330-point band, filled and cropped at 50% 30% like the site's object-position.
            Color.clear
                .frame(height: 330).frame(maxWidth: .infinity)
                .overlay {
                    if let image {
                        GeometryReader { proxy in
                            let width = max(proxy.size.width, 330 * image.aspectRatio)
                            let height = width / image.aspectRatio
                            RemoteImage(variants: image.sources, aspectRatio: image.aspectRatio, alt: hero.imageAlt)
                                .frame(width: width, height: height)
                                .position(x: proxy.size.width / 2, y: 165 - (height - 330) * (0.3 - 0.5))
                        }
                    } else { Palette.muted }
                }
                .clipped()
            card.padding(.horizontal, Space.s3_5).padding(.top, -Space.s16)
        }
        .overlay(alignment: .topTrailing) {
            RemixSticker { go(.path("/remix")) }.offset(x: -4, y: 206)
        }
    }

    private var card: some View {
        VStack(alignment: .leading, spacing: 0) {
            if !hero.kicker.isEmpty { Eyebrow(hero.kicker, color: Palette.brand).padding(.bottom, Space.s3_5) }
            headline
                .font(Typeface.hero(.hero))
                .foregroundStyle(Palette.white)
                .accessibilityElement(children: .ignore)
                .accessibilityLabel(hero.headline.replacingOccurrences(of: "\n", with: " "))
                .accessibilityAddTraits(.isHeader)
            if !hero.motto.isEmpty { Text(hero.motto).font(Typeface.body(.base)).foregroundStyle(Palette.white).padding(.top, Space.s4) }
            Button { go(.search) } label: {
                HStack(spacing: Space.s2) {
                    Text(hero.cta)
                    SiteIcon.arrowRight.image.resizable().frame(width: 24, height: 24).rotationEffect(.degrees(-45))
                }
                .font(Typeface.body(.lg, weight: .bold))
                .foregroundStyle(Palette.ink)
                .padding(.horizontal, Space.s8).frame(minHeight: 52)
                .background(Palette.brand, in: .capsule)
            }
            .buttonStyle(CardPressStyle())
            .padding(.top, Space.s5)
            .accessibilityIdentifier("hero-cta")
        }
        .padding(.horizontal, Space.s6).padding(.top, Space.s7).padding(.bottom, Space.s6)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(alignment: .bottomTrailing) {
            Ellipse().fill(Palette.brandAlt).frame(width: 320, height: 288).rotationEffect(.degrees(-12)).offset(x: 170, y: 170)
        }
        .background(Self.gradient)
        .clipShape(UnevenRoundedRectangle(topLeadingRadius: 28, bottomLeadingRadius: 8, bottomTrailingRadius: 28, topTrailingRadius: 28))
        .elevation(.glow)
    }

    /// Lines as written; the sticker word (default: the last word) sits on a tilted pink blob.
    private var headline: some View {
        let lines = hero.headline.split(separator: "\n", omittingEmptySubsequences: false).map(String.init)
        let word = hero.sticker.isEmpty ? (hero.headline.split(whereSeparator: \.isWhitespace).last.map(String.init) ?? "") : hero.sticker
        let stickerLine = lines.lastIndex { $0.contains(word) }
        return VStack(alignment: .leading, spacing: 0) {
            ForEach(Array(lines.enumerated()), id: \.offset) { index, line in
                if index == stickerLine, !word.isEmpty, let range = line.range(of: word, options: .backwards) {
                    HStack(spacing: 0) {
                        Text(String(line[..<range.lowerBound]))
                        Text(word)
                            .foregroundStyle(Palette.ink)
                            .padding(.horizontal, TextSize.hero.rawValue * 0.2)
                            // Bowlby's line box is much taller than its capitals; hug the capitals.
                            .background(StickerShape().fill(Palette.brand).padding(.top, Space.s1).padding(.bottom, Space.s0_5))
                            .rotationEffect(.degrees(-3))
                            .padding(.leading, -TextSize.hero.rawValue * 0.04)
                        Text(String(line[range.upperBound...]))
                    }
                } else {
                    Text(line)
                }
            }
            .frame(height: 42, alignment: .leading) // leading-none
        }
        .padding(.vertical, Space.s1)
        .tracking(Tracking.tight(.hero))
        .lineSpacing(0)
    }
}

/// The yellow "New Remix recipes" starburst; it opens Remix.
struct RemixSticker: View {
    let action: () -> Void
    var body: some View {
        Button(action: action) {
            ZStack {
                Starburst().fill(Palette.sticker).elevation(.sticker)
                VStack(spacing: Space.s0_5) {
                    Text("NEW").font(Typeface.body(.xs, weight: .bold)).tracking(Tracking.eyebrow(.xs))
                    Text("REMIX").font(Typeface.hero(.lg))
                    Text("recipes").font(Typeface.body(.xs, weight: .bold))
                }
                .foregroundStyle(Palette.ink)
                .padding(.top, -Space.s0_5)
            }
            .frame(width: 116, height: 116)
            .rotationEffect(.degrees(12))
        }
        .buttonStyle(CardPressStyle())
        .accessibilityLabel("New: Remix recipes")
    }
}

/// The site's 32-point starburst polygon (viewBox 120).
struct Starburst: Shape {
    func path(in rect: CGRect) -> Path {
        let points: [(CGFloat, CGFloat)] = [(60,0),(69.9,10),(83,4.6),(88.3,17.6),(102.4,17.6),(102.4,31.7),(115.4,37),(110,50.1),(120,60),(110,69.9),(115.4,83),(102.4,88.3),(102.4,102.4),(88.3,102.4),(83,115.4),(69.9,110),(60,120),(50.1,110),(37,115.4),(31.7,102.4),(17.6,102.4),(17.6,88.3),(4.6,83),(10,69.9),(0,60),(10,50.1),(4.6,37),(17.6,31.7),(17.6,17.6),(31.7,17.6),(37,4.6),(50.1,10)]
        var path = Path()
        for (index, point) in points.enumerated() {
            let p = CGPoint(x: rect.minX + point.0 / 120 * rect.width, y: rect.minY + point.1 / 120 * rect.height)
            if index == 0 { path.move(to: p) } else { path.addLine(to: p) }
        }
        path.closeSubpath()
        return path
    }
}

// MARK: Sections

/// Centered eyebrow, display title and the short pink→orange rule (the site's SectionHeading).
struct SectionHeading: View {
    let eyebrow: String
    let title: String
    var body: some View {
        VStack(spacing: 0) {
            Eyebrow(eyebrow).padding(.bottom, Space.s2)
            Text(title)
                .font(Typeface.display(.page, weight: .extrabold, relativeTo: .largeTitle))
                .foregroundStyle(Palette.ink)
                .multilineTextAlignment(.center)
                .accessibilityAddTraits(.isHeader)
            LinearGradient(colors: [Palette.brand, Palette.brandAlt], startPoint: .leading, endPoint: .trailing)
                .frame(width: 60, height: 3).clipShape(.capsule)
                .padding(.top, Space.s4).padding(.bottom, Space.s10)
                .accessibilityHidden(true)
        }
        .frame(maxWidth: .infinity)
        .padding(.horizontal, Space.s8)
    }
}

struct ViewAllLink: View {
    let label: String
    let action: () -> Void
    var body: some View {
        Button(action: action) {
            HStack(spacing: Space.s2) {
                Text(label)
                SiteIcon.arrowRight.image.resizable().frame(width: 16, height: 16)
            }
            .font(Typeface.body(.sm, weight: .bold))
            .foregroundStyle(Palette.ink)
            .frame(minHeight: 44)
        }
    }
}

/// A 3:2 photo tile with its label on a plum chip (the site's BrowseCard).
struct BrowseTile: View {
    let category: HomeCategory
    let image: RecipeImage?
    var body: some View {
        Color.clear
            .aspectRatio(1.5, contentMode: .fit)
            .background {
                if let image {
                    RemoteImage(variants: image.sources, aspectRatio: image.aspectRatio, alt: "").aspectRatio(contentMode: .fill)
                } else { Palette.muted }
            }
            .overlay(alignment: .bottom) {
                Text(category.label)
                    .font(Typeface.body(.xs, weight: .bold))
                    .foregroundStyle(Palette.onDarkLabel)
                    .lineLimit(1).minimumScaleFactor(0.8)
                    .padding(.horizontal, Space.s2).padding(.vertical, Space.s1)
                    .frame(maxWidth: .infinity)
                    .background(Palette.ink, in: .rect(cornerRadius: Radius.field))
                    .padding(Space.s2)
            }
            .clipShape(.rect(cornerRadius: Radius.surface))
            .accessibilityElement(children: .ignore)
            .accessibilityLabel(category.label)
            .accessibilityAddTraits(.isButton)
    }
}
