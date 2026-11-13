import SwiftUI
import UIKit
import WebKit

/// Prints the site's own print layout for a recipe (its print stylesheet), at today's count,
/// so a printout from the app is identical to one from the browser.
@MainActor
enum RecipePrinter {
    private static var loader: Loader?

    static func print(slug: String, title: String, count: Int?, base: URL) {
        var components = URLComponents(url: base.appending(path: "recipes/\(slug)"), resolvingAgainstBaseURL: false)!
        if let count, count != 1 { components.queryItems = [URLQueryItem(name: "count", value: String(count))] }
        guard let url = components.url else { return }
        let loader = Loader(title: title)
        Self.loader = loader
        loader.start(url) { Self.loader = nil }
    }

    final class Loader: NSObject, WKNavigationDelegate {
        /// Offscreen render size for the print page (US Letter at 96 dpi, roughly).
        static let printPage = CGSize(width: 800, height: 1100)
        let title: String
        let webView = WKWebView(frame: CGRect(origin: .zero, size: Loader.printPage))
        var done: (() -> Void)?

        init(title: String) { self.title = title }

        func start(_ url: URL, done: @escaping () -> Void) {
            self.done = done
            webView.navigationDelegate = self
            webView.load(URLRequest(url: url))
        }

        func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
            // Let hydration apply ?count= before printing.
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.6) { [self] in
                let controller = UIPrintInteractionController.shared
                let info = UIPrintInfo(dictionary: nil)
                info.jobName = title
                info.outputType = .general
                controller.printInfo = info
                controller.printFormatter = webView.viewPrintFormatter()
                controller.present(animated: true) { [self] _, _, _ in done?() }
            }
        }

        func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) { done?() }
        func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) { done?() }
    }
}
