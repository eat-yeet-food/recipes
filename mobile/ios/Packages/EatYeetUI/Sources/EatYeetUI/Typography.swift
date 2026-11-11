import SwiftUI

/// Site type: Geller headline for display (`--font-display`), Avenir Next for body (`--font-body`).
/// Sizes scale with Dynamic Type relative to the matching text style.
public enum Typeface {
    public static func display(_ size: CGFloat, weight: Font.Weight = .bold, relativeTo style: Font.TextStyle = .title) -> Font {
        let name = switch weight {
        case .black, .heavy: "GellerTest-HeadlineBlack"
        case .semibold: "GellerTest-HeadlineSemiBold"
        case .regular, .medium, .light, .thin, .ultraLight: "GellerTest-HeadlineRegular"
        default: "GellerTest-HeadlineBold"
        }
        return .custom(name, size: size, relativeTo: style)
    }

    /// Bowlby One SC (`--font-hero`): the wordmark and the home headline.
    public static func hero(_ size: CGFloat, relativeTo style: Font.TextStyle = .largeTitle) -> Font {
        .custom("BowlbyOneSC-Regular", size: size, relativeTo: style)
    }

    public static func body(_ size: CGFloat = 17, weight: Font.Weight = .regular, relativeTo style: Font.TextStyle = .body) -> Font {
        let name = switch weight {
        case .bold, .heavy, .black: "AvenirNext-Bold"
        case .semibold: "AvenirNext-DemiBold"
        case .medium: "AvenirNext-Medium"
        default: "AvenirNext-Regular"
        }
        return .custom(name, size: size, relativeTo: style)
    }
}

/// Small spaced capitals above a section (the site's `Eyebrow`).
public struct Eyebrow: View {
    let text: String
    let color: Color
    public init(_ text: String, color: Color = Palette.ink) { self.text = text; self.color = color }
    public var body: some View {
        Text(text.uppercased())
            .font(Typeface.body(13, weight: .bold, relativeTo: .caption))
            .tracking(2)
            .foregroundStyle(color)
            .accessibilityAddTraits(.isHeader)
    }
}
