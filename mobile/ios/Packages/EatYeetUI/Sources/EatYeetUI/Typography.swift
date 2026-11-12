import SwiftUI

/// Site type: Geller headline for display (`--font-display`), Avenir Next for body (`--font-body`).
/// Sizes scale with Dynamic Type relative to the matching text style.
/// The site's type scale (Tailwind xs–2xl plus the named `--text-*` tokens, phone sizes).
public enum TextSize: CGFloat {
    case micro = 11, xs = 12, caption = 13, sm = 14, bodySm = 15, base = 16, lg = 18, xl = 20
    case titleSm = 22, xxl = 24, title = 30, section = 34, page = 38, hero = 42, display = 44
}

/// Letter-spacing steps (`--tracking-*`), in points for a given size.
public enum Tracking {
    public static func eyebrow(_ size: TextSize) -> CGFloat { size.rawValue * 0.16 }
    public static func label(_ size: TextSize) -> CGFloat { size.rawValue * 0.06 }
    public static func title(_ size: TextSize) -> CGFloat { size.rawValue * 0.02 }
    public static func tight(_ size: TextSize) -> CGFloat { size.rawValue * -0.025 }
}

/// The site's faces. Sizes come only from `TextSize`; weights only from each face's set.
public enum Typeface {
    public enum DisplayWeight { case bold, extrabold }
    public enum BodyWeight { case regular, medium, semibold, bold }

    /// Geller Headline: page and section titles bold, card and dialog titles extrabold.
    public static func display(_ size: TextSize, weight: DisplayWeight = .bold, relativeTo style: Font.TextStyle = .title) -> Font {
        .custom(weight == .extrabold ? "GellerTest-HeadlineBlack" : "GellerTest-HeadlineBold", size: size.rawValue, relativeTo: style)
    }

    /// Bowlby One SC (`--font-hero`): the wordmark and the home headline.
    public static func hero(_ size: TextSize, relativeTo style: Font.TextStyle = .largeTitle) -> Font {
        .custom("BowlbyOneSC-Regular", size: size.rawValue, relativeTo: style)
    }

    /// Avenir (`--font-body`).
    public static func body(_ size: TextSize = .base, weight: BodyWeight = .regular, relativeTo style: Font.TextStyle = .body) -> Font {
        let name = switch weight {
        case .bold: "AvenirNext-Bold"
        case .semibold: "AvenirNext-DemiBold"
        case .medium: "AvenirNext-Medium"
        case .regular: "AvenirNext-Regular"
        }
        return .custom(name, size: size.rawValue, relativeTo: style)
    }

    /// `--font-action`: filled and outlined button labels.
    public static func action(_ size: TextSize = .base) -> Font { body(size, weight: .bold, relativeTo: .headline) }
}

/// Small spaced capitals above a section (the site's `Eyebrow`).
public struct Eyebrow: View {
    let text: String
    let color: Color
    public init(_ text: String, color: Color = Palette.ink) { self.text = text; self.color = color }
    public var body: some View {
        Text(text.uppercased())
            .font(Typeface.body(.caption, weight: .bold, relativeTo: .caption))
            .tracking(Tracking.eyebrow(.caption))
            .foregroundStyle(color)
            .accessibilityAddTraits(.isHeader)
    }
}
