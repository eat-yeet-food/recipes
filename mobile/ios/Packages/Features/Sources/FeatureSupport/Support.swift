import EatYeetAPI
import EatYeetUI
import SwiftUI

extension RecipeImage {
    public var sources: [ImageSource] {
        variants.compactMap { v in URL(string: v.url).map { ImageSource(url: $0, width: v.width, format: v.format) } }
    }
    public var aspectRatio: CGFloat { height > 0 ? CGFloat(width) / CGFloat(height) : 1.5 }
}

/// Shared states for loading screens.
public struct LoadFailure: View {
    let message: String
    let retry: () async -> Void
    public init(message: String, retry: @escaping () async -> Void) { self.message = message; self.retry = retry }
    public var body: some View {
        ContentUnavailableView {
            Label("Not loaded", systemImage: "wifi.exclamationmark")
        } description: {
            Text(message)
        } actions: {
            Button("Try again") { Task { await retry() } }.buttonStyle(PrimaryButtonStyle())
        }
    }
}

/// Clock and yield line under a recipe title, as on the site's cards.
public struct RecipeMeta: View {
    let time: String
    let yield: String
    public init(time: String, yield: String) { self.time = time; self.yield = yield }
    public var body: some View {
        HStack(spacing: Space.s4) {
            if !time.isEmpty { item(time, icon: .clock) }
            if !yield.isEmpty { item(yield, icon: .utensilsCrossed) }
        }
        .font(Typeface.body(.xs, relativeTo: .caption))
        .foregroundStyle(Palette.mutedForeground)
    }

    private func item(_ text: String, icon: SiteIcon) -> some View {
        HStack(spacing: Space.s1_5) {
            icon.image.resizable().frame(width: 14, height: 14).accessibilityHidden(true)
            Text(text)
        }
    }
}

/// Placeholder destinations so deep links resolve before their features land.
public struct PendingScreen: View {
    let title: String
    let detail: String
    public init(title: String, detail: String) { self.title = title; self.detail = detail }
    public var body: some View {
        ContentUnavailableView(title, systemImage: "hammer", description: Text(detail))
            .navigationTitle(title)
    }
}
