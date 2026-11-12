import SwiftUI

/// Role tokens ported from packages/l8/web/src/styles/global.css (docs/design-system.md).
/// Components use roles, never the plum ramp directly.
public enum Palette {
    static func hex(_ value: UInt32) -> Color {
        Color(red: Double((value >> 16) & 0xff) / 255, green: Double((value >> 8) & 0xff) / 255, blue: Double(value & 0xff) / 255)
    }

    public static let ink = hex(0x2A0E28)              // plum-900
    public static let actionHover = hex(0x4A1D47)      // plum-700
    public static let brand = hex(0xFF7AC0)            // pink
    public static let brandAlt = hex(0xFF8A3D)         // orange
    public static let brandSoft = hex(0xFFE0EF)
    public static let onDarkLabel = hex(0xFFE3F1)
    public static let tint = hex(0xFFF0F7)
    public static let background = Color.white
    public static let card = Color.white
    public static let muted = hex(0xF3ECF1)
    public static let mutedForeground = hex(0x634A5F)
    public static let border = hex(0xDDCFD8)
    public static let input = hex(0x86697F)
    public static let danger = hex(0xAD2939)
    public static let dangerSoft = hex(0xFFF0F2)
    public static let sticker = hex(0xFFE14D)
    public static let white = Color.white
    /// Hairlines on plum: on-dark-label mixed 30% into ink.
    public static let borderOnDark = hex(0x6A4F67)
    /// The plum ramp, for the hero's gradient only (components use roles).
    public static let plum950 = hex(0x1C0819)
    public static let plum800 = hex(0x3A1638)
    public static let plum600 = hex(0x5A2456)
    public static let plum400 = hex(0x9A4590)
}

/// The site's spacing scale (Tailwind steps, 4pt each): `Space.s4` is `p-4`, 16pt.
public enum Space {
    public static let s0_5: CGFloat = 2
    public static let s1: CGFloat = 4
    public static let s1_5: CGFloat = 6
    public static let s2: CGFloat = 8
    public static let s2_5: CGFloat = 10
    public static let s3: CGFloat = 12
    public static let s3_5: CGFloat = 14
    public static let s4: CGFloat = 16
    public static let s5: CGFloat = 20
    public static let s6: CGFloat = 24
    public static let s7: CGFloat = 28
    public static let s8: CGFloat = 32
    public static let s9: CGFloat = 36
    public static let s10: CGFloat = 40
    public static let s12: CGFloat = 48
    public static let s14: CGFloat = 56
    public static let s16: CGFloat = 64
    public static let s20: CGFloat = 80
    /// `--spacing-page-x-mobile`
    public static let pageX: CGFloat = 16
    /// `--spacing-choice-inset`
    public static let choiceInset: CGFloat = 6
    /// Minimum touch target.
    public static let target: CGFloat = 44
}

/// The site's elevation scale (`--shadow-*`).
public enum Elevation {
    case card, raised, glow, overlay, sticker
}

public extension View {
    func elevation(_ level: Elevation) -> some View {
        switch level {
        case .card: shadow(color: Palette.ink.opacity(0.08), radius: 0, y: 1)
        case .raised: shadow(color: Palette.ink.opacity(0.12), radius: 12, y: 8)
        case .glow: shadow(color: Palette.brand.opacity(0.25), radius: 20, y: 16)
        case .overlay: shadow(color: Palette.ink.opacity(0.22), radius: 28, y: 24)
        case .sticker: shadow(color: Palette.ink.opacity(0.2), radius: 3, y: 2)
        }
    }
}

public enum Radius {
    public static let control: CGFloat = 999
    public static let field: CGFloat = 18
    public static let surface: CGFloat = 28
    public static let choice: CGFloat = 24
    public static let choiceItem: CGFloat = choice - Space.choiceInset
    public static let filter: CGFloat = 4
}

/// The pink→orange stripe that tops one white action card or dialog per view.
public struct BrandStripe: View {
    public init() {}
    public var body: some View {
        LinearGradient(colors: [Palette.brand, Palette.brandAlt], startPoint: .leading, endPoint: .trailing)
            .frame(height: 6)
            .accessibilityHidden(true)
    }
}

/// Filled plum pill with a plain label.
public struct PrimaryButtonStyle: ButtonStyle {
    let large: Bool
    public init(large: Bool = false) { self.large = large }
    public func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(Typeface.action(large ? .lg : .base))
            .foregroundStyle(Palette.onDarkLabel)
            .padding(.horizontal, Space.s6)
            .frame(minHeight: large ? 52 : 48)
            .background(configuration.isPressed ? Palette.actionHover : Palette.ink, in: .capsule)
    }
}

/// The site's Lucide icons (same artwork as the web), as template images.
public enum SiteIcon: String {
    case chefHat = "chef-hat"
    case printer
    case clock
    case utensilsCrossed = "utensils-crossed"
    case menu
    case search
    case arrowRight = "arrow-right"

    public var image: Image { Image(rawValue, bundle: .module) }
}

/// The site's round action on the plum band (RecipeIconAction, tone on-dark).
public struct RoundIconAction: View {
    let icon: SiteIcon
    let label: String
    let action: () -> Void
    public init(_ icon: SiteIcon, label: String, action: @escaping () -> Void) {
        self.icon = icon
        self.label = label
        self.action = action
    }
    public var body: some View {
        Button(action: action) {
            icon.image
                .resizable()
                .frame(width: 20, height: 20)
                .foregroundStyle(Palette.white)
                .frame(width: 44, height: 44)
                .background(Palette.borderOnDark, in: .circle)
        }
        .accessibilityLabel(label)
    }
}
