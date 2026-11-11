import SwiftUI
import UIKit

/// Installs a three-finger long-press recognizer on the window (opens the dev menu).
struct ThreeFingerLongPress: UIViewRepresentable {
    let action: () -> Void

    func makeCoordinator() -> Coordinator { Coordinator(action: action) }

    func makeUIView(context: Context) -> UIView {
        let view = HostView()
        view.coordinator = context.coordinator
        return view
    }

    func updateUIView(_ uiView: UIView, context: Context) { context.coordinator.action = action }

    final class Coordinator: NSObject, UIGestureRecognizerDelegate {
        var action: () -> Void
        init(action: @escaping () -> Void) { self.action = action }
        @objc func fire(_ recognizer: UILongPressGestureRecognizer) {
            if recognizer.state == .began { action() }
        }
        func gestureRecognizer(_: UIGestureRecognizer, shouldRecognizeSimultaneouslyWith _: UIGestureRecognizer) -> Bool { true }
    }

    final class HostView: UIView {
        weak var coordinator: Coordinator?
        private var installed = false
        override func didMoveToWindow() {
            super.didMoveToWindow()
            guard let window, let coordinator, !installed else { return }
            let recognizer = UILongPressGestureRecognizer(target: coordinator, action: #selector(Coordinator.fire))
            recognizer.numberOfTouchesRequired = 3
            recognizer.minimumPressDuration = 0.6
            recognizer.cancelsTouchesInView = false
            recognizer.delegate = coordinator
            window.addGestureRecognizer(recognizer)
            installed = true
        }
    }
}
