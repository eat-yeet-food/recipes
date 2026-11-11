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
}

public enum Radius {
    public static let control: CGFloat = 999
    public static let field: CGFloat = 18
    public static let surface: CGFloat = 28
    public static let choice: CGFloat = 24
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
            .font(large ? Typeface.body(17, weight: .semibold) : .headline)
            .foregroundStyle(Palette.onDarkLabel)
            .padding(.horizontal, 24)
            .frame(minHeight: large ? 52 : 48)
            .background(configuration.isPressed ? Palette.actionHover : Palette.ink, in: .capsule)
    }
}

/// The site's Lucide icons (same artwork as the web), as template images.
public enum SiteIcon: String {
    case chefHat = "chef-hat"
    case printer

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
                .foregroundStyle(.white)
                .frame(width: 44, height: 44)
                .background(.white.opacity(0.15), in: .circle)
        }
        .accessibilityLabel(label)
    }
}
