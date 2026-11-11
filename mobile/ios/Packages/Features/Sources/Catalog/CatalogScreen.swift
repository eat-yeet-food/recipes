import EatYeetCore
import EatYeetUI
import SwiftUI

/// Placeholder home until the app API lands (milestone 2).
public struct CatalogScreen: View {
    @Environment(AppEnvironment.self) private var environment
    @ScaledMetric(relativeTo: .largeTitle) private var titleSize: CGFloat = 44
    private let build: BuildInfo

    public init(build: BuildInfo) { self.build = build }

    public var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 24) {
                Text("Eat / Yeet")
                    .font(.system(size: titleSize, weight: .heavy))
                    .foregroundStyle(Palette.ink)
                    .accessibilityAddTraits(.isHeader)
                VStack(alignment: .leading, spacing: 12) {
                    Text("Recipes are coming to the app.")
                        .font(.title3.weight(.semibold))
                    Text("Shake the phone to open the developer menu.")
                        .foregroundStyle(Palette.mutedForeground)
                    Text("\(environment.backend.label) · \(build.summary)")
                        .font(.footnote.monospaced())
                        .foregroundStyle(Palette.mutedForeground)
                        .accessibilityIdentifier("build-banner")
                }
                .padding(24)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(Palette.card)
                .overlay(alignment: .top) { BrandStripe() }
                .clipShape(.rect(cornerRadius: Radius.surface))
                .overlay { RoundedRectangle(cornerRadius: Radius.surface).stroke(Palette.border) }
            }
            .padding(20)
        }
        .background(Palette.background)
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
