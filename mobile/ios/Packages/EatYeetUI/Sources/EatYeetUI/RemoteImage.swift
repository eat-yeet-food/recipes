import SwiftUI

/// One encoded size of an image, as the app API lists them.
public struct ImageSource: Sendable, Equatable {
    public let url: URL
    public let width: Int
    public let format: String
    public init(url: URL, width: Int, format: String) { self.url = url; self.width = width; self.format = format }
}

/// Picks the smallest variant at least as wide as the rendered pixels (never upscaled
/// beyond the largest), preferring AVIF, then WebP, then anything.
public enum ImageVariantPicker {
    public static func pick(_ variants: [ImageSource], points: CGFloat, scale: CGFloat) -> ImageSource? {
        let needed = Int((points * scale).rounded(.up))
        for format in ["avif", "webp", "jpeg", "jpg", "png"] {
            let matches = variants.filter { $0.format == format }.sorted { $0.width < $1.width }
            if let match = matches.first(where: { $0.width >= needed }) ?? matches.last { return match }
        }
        return variants.max { $0.width < $1.width }
    }
}

/// An image at a fixed aspect ratio (reserved space, no layout shift), loading the right variant.
public struct RemoteImage: View {
    let variants: [ImageSource]
    let aspectRatio: CGFloat
    let alt: String
    @Environment(\.displayScale) private var scale
    /// Bumped to retry a failed load (server restarting, flaky network): 1 s, 2 s, 4 s, … up to 30 s.
    @State private var attempt = 0

    public init(variants: [ImageSource], aspectRatio: CGFloat, alt: String) {
        self.variants = variants
        self.aspectRatio = aspectRatio
        self.alt = alt
    }

    public var body: some View {
        Color(Palette.muted)
            .aspectRatio(aspectRatio, contentMode: .fit)
            .overlay {
                GeometryReader { proxy in
                    if let source = ImageVariantPicker.pick(variants, points: proxy.size.width, scale: scale) {
                        AsyncImage(url: source.url, transaction: Transaction(animation: .easeOut(duration: 0.2))) { phase in
                            if let image = phase.image {
                                image.resizable().scaledToFill()
                                    .frame(width: proxy.size.width, height: proxy.size.height)
                                    .clipped()
                            } else if case .failure = phase {
                                Color.clear.task {
                                    try? await Task.sleep(for: .seconds(min(30, pow(2, Double(attempt)))))
                                    attempt += 1
                                }
                            }
                        }
                        .id(attempt)
                    }
                }
            }
            .accessibilityElement()
            .accessibilityLabel(alt)
            .accessibilityAddTraits(.isImage)
    }
}
