import EatYeetCore
import SwiftUI
import UIKit

extension Notification.Name {
    /// Posted when the device is shaken.
    public static let deviceDidShake = Notification.Name("eatyeet.deviceDidShake")
}

extension UIWindow {
    override open func motionEnded(_ motion: UIEvent.EventSubtype, with event: UIEvent?) {
        if motion == .motionShake { NotificationCenter.default.post(name: .deviceDidShake, object: nil) }
        super.motionEnded(motion, with: event)
    }
}

/// Safe-area tint and an 8 pt grid, toggled from the dev menu.
public struct LayoutOverlays: ViewModifier {
    @Environment(FeatureFlags.self) private var flags
    public init() {}

    public func body(content: Content) -> some View {
        content.overlay {
            ZStack {
                if flags.showSafeAreas {
                    GeometryReader { proxy in
                        let insets = proxy.safeAreaInsets
                        VStack(spacing: 0) {
                            Color.red.opacity(0.25).frame(height: insets.top)
                            Spacer()
                            Color.red.opacity(0.25).frame(height: insets.bottom)
                        }
                    }
                    .ignoresSafeArea()
                }
                if flags.showGrid {
                    Canvas { context, size in
                        var path = Path()
                        stride(from: 0, through: size.width, by: 8).forEach { path.addRect(CGRect(x: $0, y: 0, width: 0.5, height: size.height)) }
                        stride(from: 0, through: size.height, by: 8).forEach { path.addRect(CGRect(x: 0, y: $0, width: size.width, height: 0.5)) }
                        context.fill(path, with: .color(.blue.opacity(0.2)))
                    }
                    .ignoresSafeArea()
                }
            }
            .allowsHitTesting(false)
        }
    }
}
