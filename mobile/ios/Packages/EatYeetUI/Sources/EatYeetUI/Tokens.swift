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
    /// Secondary text on plum (`text-on-dark-label/70`).
    public static let onDarkMuted = onDarkLabel.opacity(0.7)
    public static let tint = hex(0xFFF0F7)
    public static let background = Color.white
    public static let card = Color.white
    public static let muted = hex(0xF3ECF1)
    public static let mutedForeground = hex(0x634A5F)
    public static let border = hex(0xDDCFD8)
    public static let input = hex(0x86697F)
    public static let danger = hex(0xAD2939)
    public static let dangerSoft = hex(0xFFF0F2)
    /// Danger fill while pressed.
    public static let dangerPressed = hex(0xB94957)
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

/// Control heights (`min-h-*` on the site's buttons and fields).
public enum Control {
    /// Compact pills and segmented items (`min-h-10`).
    public static let compact: CGFloat = Space.s10
    /// Buttons, fields and rows (`min-h-12`).
    public static let regular: CGFloat = Space.s12
    /// Large buttons (`min-h-13`).
    public static let large: CGFloat = 52
    /// The app bar row.
    public static let bar: CGFloat = Space.s14
}

/// Line and outline widths.
public enum Stroke {
    /// Dividers and field outlines.
    public static let hairline: CGFloat = 1
    /// Outlined buttons.
    public static let control: CGFloat = 1.5
    /// Underlines, rails, checkboxes and selected rules.
    public static let rule: CGFloat = 2
    /// Short accent rules under headings.
    public static let accent: CGFloat = 3
    /// Progress bars and the dock grabber.
    public static let bar: CGFloat = 4
    /// The brand stripe on cards and dialogs.
    public static let stripe: CGFloat = 6
}

/// Glyph sizes for icons, on the type scale so icons sit with their text.
public enum IconSize {
    public static let xs: CGFloat = TextSize.sm.rawValue      // 14: inline meta icons, checkmarks
    public static let sm: CGFloat = TextSize.base.rawValue    // 16: link arrows, chevrons, small stars
    public static let md: CGFloat = TextSize.lg.rawValue      // 18: bar buttons (Back, Close)
    public static let lg: CGFloat = TextSize.xl.rawValue      // 20: action circles
    public static let xl: CGFloat = TextSize.xxl.rawValue     // 24: hero arrow, rating stars
}

/// Timing for UI motion. Every animation uses one of these.
public enum Motion {
    public static let quick: Double = 0.18     // pill handoffs
    public static let standard: Double = 0.2   // selections, image fades, step moves
    public static let gentle: Double = 0.25   // bars, presses
    public static let slow: Double = 0.3       // progress
    public static let sheet: Double = 0.35     // waiting for a sheet to close
    /// The card → recipe hand-off: a little longer and springy, so the lift reads.
    public static let hero: Double = 0.55
    public static let heroBounce: Double = 0.12
}

/// Minimum travel before a drag counts as a swipe.
public enum Travel {
    public static let swipe: CGFloat = Space.s4
    public static let page: CGFloat = 30
    /// Scroll offset counted as "at the top", and travel that hides or shows the home bar.
    public static let scrollTop: CGFloat = Space.s2
    public static let scrollHide: CGFloat = Space.s1_5
    /// Speed (pt/s) that counts as a flick.
    public static let flick: CGFloat = 800
    /// How much more horizontal than vertical a drag must be to count as a swipe back.
    public static let horizontalBias: CGFloat = 1.5
    /// Horizontal travel that turns a page swipe into a step change.
    public static let pageCommit: CGFloat = 50
}

/// Line spacing added to a face's natural line height, matching the site's `leading-*`.
public enum Leading {
    /// Body prose (`leading-relaxed` on 16px).
    public static func prose(_ size: TextSize) -> CGFloat { size.rawValue * 0.72 - 4 }
    /// Short descriptions (`leading-relaxed` on smaller text).
    public static func snug(_ size: TextSize) -> CGFloat { size.rawValue * 0.625 - 3 }
    /// Large step text in cook mode.
    public static let step: CGFloat = Space.s1
    /// Display type set solid (`leading-none`).
    public static let solid: CGFloat = -Space.s1
}

/// Fixed measures for particular layouts.
public enum Measure {
    /// Account and sign-in forms (`max-w-md`).
    public static let formWidth: CGFloat = 440
    /// Cook mode's landscape ingredient panel.
    public static let sidePanel: CGFloat = 280
    /// Cook mode's intro photo.
    public static let cookPhoto: CGFloat = 240
    /// Home hero photo, the card overlapping it and its decorations.
    public static let heroPhoto: CGFloat = 330
    public static let heroStickerOffset = CGSize(width: -4, height: 206)
    public static let heroBlob = CGSize(width: 320, height: 288)
    public static let heroBlobOffset = CGSize(width: 170, height: 170)
    public static let heroBlobTilt: Double = -12
    public static let heroHeadlineLine: CGFloat = TextSize.hero.rawValue
    /// Where the hero photo is anchored vertically (the site's object-position 30%).
    public static let heroFocusY: CGFloat = 0.3
    public static let sticker: CGFloat = 116
    /// Hand-off without a known card: grows from the screen inset by this fraction.
    public static let heroFallbackInset: CGFloat = 0.1
    /// Darkness behind an opening recipe at full open.
    public static let heroScrim: Double = 0.35
    /// Divider between the batch stepper's segments.
    public static let stepperDivider: CGFloat = TextSize.titleSm.rawValue
    /// Recipe card photos (3:2).
    public static let cardImage: CGFloat = 1.5
    /// Short accent rule under section headings.
    public static let accentRule: CGFloat = 60
    /// Ingredient-row checkbox and the gather counter dot.
    public static let checkbox: CGFloat = Space.s7
    public static let badge: CGFloat = Space.s8
    /// Reviewer and replier avatars.
    public static let avatar: CGFloat = Space.s10
    public static let avatarSmall: CGFloat = Space.s8
    /// Remix: flour amount field and the schedule's time column.
    public static let amountField: CGFloat = 96
    public static let timeColumn: CGFloat = 52
    /// Distance the Review pill drops when it hands off to the drawer.
    public static let pillDrop: CGFloat = 120
    /// Tilts: the wordmark sticker, the hero highlight and the Remix starburst.
    public static let tiltWordmark: Double = -4
    public static let tiltHighlight: Double = -3
    public static let tiltSticker: Double = 12
    /// Cook-mode progress grabber and remix dock grabber widths.
    public static let grabber: CGFloat = Space.s16
    /// Meta-row bullet.
    public static let dot: CGFloat = Space.s1
    /// Step rail inset (centred on the 44pt marker).
    public static let railInset: CGFloat = Space.target / 2 - Stroke.rule / 2
}

/// The site's elevation scale (`--shadow-*`).
public enum Elevation {
    case card, raised, glow, overlay, sticker
}

public extension View {
    /// `amount` (0…1) scales the shadow in and out, for elements that gain or lose elevation as they move.
    func elevation(_ level: Elevation, amount: Double = 1) -> some View {
        switch level {
        case .card: shadow(color: Palette.ink.opacity(0.08 * amount), radius: 0, y: 1 * amount)
        case .raised: shadow(color: Palette.ink.opacity(0.12 * amount), radius: 12 * amount, y: 8 * amount)
        case .glow: shadow(color: Palette.brand.opacity(0.25 * amount), radius: 20 * amount, y: 16 * amount)
        case .overlay: shadow(color: Palette.ink.opacity(0.22 * amount), radius: 28 * amount, y: 24 * amount)
        case .sticker: shadow(color: Palette.ink.opacity(0.2 * amount), radius: 3 * amount, y: 2 * amount)
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
    /// Checkboxes and used-ingredient rows (`rounded-lg`).
    public static let check: CGFloat = Space.s2
}

/// The pink→orange stripe that tops one white action card or dialog per view.
public struct BrandStripe: View {
    public init() {}
    public var body: some View {
        LinearGradient(colors: [Palette.brand, Palette.brandAlt], startPoint: .leading, endPoint: .trailing)
            .frame(height: Stroke.stripe)
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
            .frame(minHeight: large ? Control.large : Control.regular)
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
    case arrowLeft = "arrow-left"

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
                .frame(width: IconSize.lg, height: IconSize.lg)
                .foregroundStyle(Palette.white)
                .frame(width: Space.target, height: Space.target)
                .background(Palette.borderOnDark, in: .circle)
        }
        .accessibilityLabel(label)
    }
}
