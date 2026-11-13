import EatYeetAPI
import EatYeetUI
import Observation
import SwiftUI

/// The card → recipe hand-off: a tapped card's photo lifts and settles into the recipe page's
/// photo while the page grows out of the card's outline; Back, an edge swipe or a drag runs it in
/// reverse (following the finger). Cards report where they are (`recipeHeroSource`), the page
/// reports where its photo lands (`recipeHeroDestination`) and `RecipeHeroLayer` draws the move.
@MainActor
@Observable
public final class RecipeHero {
    public struct Opening: Equatable {
        public let slug: String
        public let image: RecipeImage?
        /// Global frames at the moment of the tap.
        public let card: CGRect?
        public let photo: CGRect?
        /// The tab whose layer shows it (each tab keeps its own stack).
        public let scope: String
    }

    public private(set) var opening: Opening?
    /// 0 is the card, 1 the page.
    public private(set) var progress: CGFloat = 0
    /// Where the page's photo sits once open (global).
    public private(set) var destination: CGRect?
    /// True while a finger drives the transition (no animation).
    public private(set) var tracking = false
    /// True once the page has fully opened: the real photo shows and the flying one is gone.
    /// (Views can't key this off `progress`, which reads 1 as soon as an animation to 1 starts.)
    public private(set) var settled = false

    private var cards: [String: CGRect] = [:]
    private var photos: [String: CGRect] = [:]
    private var images: [String: RecipeImage] = [:]
    private var started = false

    public init() {}

    public static let spring = Animation.spring(duration: Motion.hero, bounce: Motion.heroBounce)

    public func open(_ slug: String, scope: String) {
        guard opening == nil else { return }
        opening = Opening(slug: slug, image: images[slug], card: cards[slug], photo: photos[slug], scope: scope)
        progress = 0
        destination = nil
        started = false
        settled = false
        // Wait (briefly) for the page to report its photo, so the photo flies to a known spot.
        Task { try? await Task.sleep(for: .seconds(Motion.quick)); begin() }
    }

    public func close() {
        guard opening != nil else { return }
        tracking = false
        settled = false
        withAnimation(Self.spring) { progress = 0 } completion: { [weak self] in
            self?.opening = nil
            self?.destination = nil
        }
    }

    /// Follows a finger: `fraction` of the way back toward the card.
    public func track(_ fraction: CGFloat) {
        tracking = true
        settled = false
        progress = 1 - min(max(fraction, 0), 1)
    }

    /// Lets go: close past a third of the way (or on a flick), otherwise settle open again.
    public func release(_ fraction: CGFloat, velocity: CGFloat) {
        if fraction > 1 / 3 || velocity > Travel.flick { close() } else {
            tracking = false
            withAnimation(Self.spring) { progress = 1 } completion: { [weak self] in self?.settled = true }
        }
    }

    func land(_ frame: CGRect) {
        guard opening != nil, !tracking, !started || settled else { return }
        destination = frame
        begin()
    }

    func report(card frame: CGRect, for slug: String) { if opening?.slug != slug { cards[slug] = frame } }
    func report(photo frame: CGRect, image: RecipeImage?, for slug: String) {
        guard opening?.slug != slug else { return }
        photos[slug] = frame
        images[slug] = image
    }

    private func begin() {
        guard opening != nil, !started else { return }
        started = true
        withAnimation(Self.spring) { progress = 1 } completion: { [weak self] in self?.settled = true }
    }
}

public extension View {
    /// Marks a recipe card (and, on its photo, `photo: true`) as a hand-off source; hidden while its
    /// recipe is open so the photo reads as lifted out of it.
    func recipeHeroSource(_ slug: String) -> some View { modifier(HeroSource(slug: slug, photo: false, image: nil)) }
    func recipeHeroPhoto(_ slug: String, image: RecipeImage?) -> some View { modifier(HeroSource(slug: slug, photo: true, image: image)) }

    /// Marks the recipe page's photo as the hand-off destination.
    func recipeHeroDestination() -> some View { modifier(HeroDestination()) }
}

private struct HeroSource: ViewModifier {
    @Environment(RecipeHero.self) private var hero: RecipeHero?
    let slug: String
    let photo: Bool
    let image: RecipeImage?

    func body(content: Content) -> some View {
        content
            .onGeometryChange(for: CGRect.self, of: { $0.frame(in: .global) }) { frame in
                if photo { hero?.report(photo: frame, image: image, for: slug) } else { hero?.report(card: frame, for: slug) }
            }
            // The card fades under the growing page and back in as the page shrinks into it, so its
            // text is already there when the photo lands (not popping in after).
            .opacity(!photo && hero?.opening?.slug == slug ? 1 - (hero?.progress ?? 0) : 1)
    }
}

private struct HeroDestination: ViewModifier {
    @Environment(RecipeHero.self) private var hero: RecipeHero?

    func body(content: Content) -> some View {
        content
            .onGeometryChange(for: CGRect.self, of: { $0.frame(in: .global) }) { hero?.land($0) }
            // The flying photo stands in for this one until it lands.
            .opacity(hero?.opening != nil && hero?.settled == false ? 0 : 1)
    }
}

/// Draws an open recipe over a tab: the page masked to a rectangle that grows from the card to the
/// screen, a scrim over what's behind, and the photo flying between the two spots.
public struct RecipeHeroLayer<Page: View>: View {
    @Environment(RecipeHero.self) private var hero
    let scope: String
    @ViewBuilder let page: (String) -> Page

    public init(scope: String, @ViewBuilder page: @escaping (String) -> Page) {
        self.scope = scope
        self.page = page
    }

    public var body: some View {
        // The layer keeps the safe area (the page lays out under the status bar itself); only the
        // scrim and the growing mask reach the screen edges.
        GeometryReader { proxy in
            if let opening = hero.opening, opening.scope == scope {
                let safe = proxy.frame(in: .global)
                let insets = proxy.safeAreaInsets
                let screen = CGRect(x: safe.minX - insets.leading, y: safe.minY - insets.top,
                                    width: safe.width + insets.leading + insets.trailing,
                                    height: safe.height + insets.top + insets.bottom)
                let p = hero.progress
                let from = opening.card ?? screen.insetBy(dx: screen.width * Measure.heroFallbackInset, dy: screen.height * Measure.heroFallbackInset)
                let shape = lerp(from, screen, p).offsetBy(dx: -safe.minX, dy: -safe.minY)
                ZStack(alignment: .topLeading) {
                    Palette.ink.opacity(Measure.heroScrim * p).ignoresSafeArea()
                    page(opening.slug)
                        .frame(width: safe.width, height: safe.height)
                        .opacity(min(1, p * 2))
                        .mask(alignment: .topLeading) {
                            RoundedRectangle(cornerRadius: Radius.surface * (1 - p))
                                .frame(width: shape.width, height: shape.height)
                                .offset(x: shape.minX, y: shape.minY)
                        }
                        .simultaneousGesture(edgeSwipe(width: screen.width))
                    if let image = opening.image, let start = opening.photo, let end = hero.destination, !hero.settled {
                        let frame = lerp(start, end, p).offsetBy(dx: -safe.minX, dy: -safe.minY)
                        RemoteImage(variants: image.sources, aspectRatio: frame.width / max(frame.height, 1), alt: image.alt)
                            .frame(width: frame.width, height: frame.height)
                            // A card's photo has square bottom corners (its text sits below); the page's
                            // photo is rounded all round. The bottom corners round with the move.
                            .clipShape(UnevenRoundedRectangle(topLeadingRadius: Radius.surface, bottomLeadingRadius: Radius.surface * p,
                                                              bottomTrailingRadius: Radius.surface * p, topTrailingRadius: Radius.surface))
                            .elevation(.overlay, amount: p)
                            .offset(x: frame.minX, y: frame.minY)
                            .allowsHitTesting(false)
                            .accessibilityHidden(true)
                    }
                }
            }
        }
    }

    /// Swiping right anywhere on the page goes back, like Back: the page shrinks toward its card
    /// under the finger. Only a mostly horizontal, rightward drag counts, so scrolling is unaffected.
    private func edgeSwipe(width: CGFloat) -> some Gesture {
        DragGesture(minimumDistance: Travel.swipe)
            .onChanged { value in
                guard hero.tracking || isBack(value.translation) else { return }
                hero.track(value.translation.width / width)
            }
            .onEnded { value in
                guard hero.tracking else { return }
                hero.release(value.translation.width / width, velocity: value.velocity.width)
            }
    }

    private func isBack(_ t: CGSize) -> Bool { t.width > 0 && t.width > abs(t.height) * Travel.horizontalBias }

    private func lerp(_ a: CGRect, _ b: CGRect, _ t: CGFloat) -> CGRect {
        CGRect(x: a.minX + (b.minX - a.minX) * t, y: a.minY + (b.minY - a.minY) * t,
               width: a.width + (b.width - a.width) * t, height: a.height + (b.height - a.height) * t)
    }
}
