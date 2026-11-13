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

/// Decoded images by URL, shared app-wide: an image already on screen (a card's photo) draws at
/// once wherever it appears next (the recipe hand-off, the recipe page) instead of reloading.
@MainActor
public final class ImageMemory {
    public static let shared = ImageMemory()
    private let cache = NSCache<NSURL, UIImage>()
    private init() { cache.totalCostLimit = 96 * 1024 * 1024 }

    func image(_ url: URL) -> UIImage? { cache.object(forKey: url as NSURL) }
    func store(_ image: UIImage, _ url: URL) {
        cache.setObject(image, forKey: url as NSURL, cost: Int(image.size.width * image.size.height * image.scale * image.scale * 4))
    }
    /// The sharpest variant of this image already decoded, if any.
    func best(_ variants: [ImageSource]) -> UIImage? {
        variants.sorted { $0.width > $1.width }.lazy.compactMap { self.image($0.url) }.first
    }
}

/// An image at a fixed aspect ratio (reserved space, no layout shift), loading the right variant.
/// Shows any already-decoded variant immediately, then the right one; fades in only when new.
public struct RemoteImage: View {
    let variants: [ImageSource]
    let aspectRatio: CGFloat
    let alt: String
    @Environment(\.displayScale) private var scale
    @State private var loaded: UIImage?

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
                    let source = ImageVariantPicker.pick(variants, points: proxy.size.width, scale: scale)
                    if let image = loaded ?? source.flatMap({ ImageMemory.shared.image($0.url) }) ?? ImageMemory.shared.best(variants) {
                        Image(uiImage: image).resizable().scaledToFill()
                            .frame(width: proxy.size.width, height: proxy.size.height)
                            .clipped()
                            .transition(.opacity)
                    }
                    Color.clear.task(id: source?.url) { await load(source) }
                }
            }
            .accessibilityElement()
            .accessibilityLabel(alt)
            .accessibilityAddTraits(.isImage)
    }

    /// Loads the variant for this size unless it's decoded already; retries a failed load
    /// (server restarting, flaky network) after 1 s, 2 s, 4 s, … up to 30 s.
    private func load(_ source: ImageSource?) async {
        guard let source, ImageMemory.shared.image(source.url) == nil else { return }
        var attempt = 0
        while !Task.isCancelled {
            if let (data, _) = try? await URLSession.shared.data(from: source.url), let image = UIImage(data: data) {
                let decoded = await image.byPreparingForDisplay() ?? image
                ImageMemory.shared.store(decoded, source.url)
                withAnimation(.easeOut(duration: Motion.standard)) { loaded = decoded }
                return
            }
            try? await Task.sleep(for: .seconds(min(30, pow(2, Double(attempt)))))
            attempt += 1
        }
    }
}
