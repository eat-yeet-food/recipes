import EatYeetAPI
import EatYeetCore
import EatYeetUI
import FeatureSupport
import SwiftUI

/// The site's /remix: your remixes (signed in), recipes to start from, and Recently deleted.
public struct RemixLibraryScreen: View {
    @Environment(AppEnvironment.self) private var environment
    @Environment(AccountStore.self) private var account
    let open: (_ slug: String, _ formulaId: String?) -> Void

    @State private var index: RemixIndex?
    @State private var list: KitchenList?
    @State private var facts: [String: String] = [:]
    @State private var error: String?
    @State private var notice: String?
    @State private var confirmingPurge: String?

    public init(open: @escaping (_ slug: String, _ formulaId: String?) -> Void) { self.open = open }

    private var api: RemixAPI { RemixAPI(base: environment.backend.baseURL) }

    public var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 0) {
                VStack(alignment: .leading, spacing: Space.s4) {
                    RemixBand(title: "Remix")
                    Text("Tweak any dough recipe, get the numbers, and save your versions.")
                        .font(Typeface.body(.lg)).foregroundStyle(Palette.mutedForeground)
                    if account.member == nil {
                        Button("Sign in") { Task { try? await account.signIn() } }
                            .font(Typeface.body(.lg, weight: .bold)).underline()
                    }
                }
                .padding(.horizontal, Space.s4).padding(.top, Space.s6).padding(.bottom, Space.s6)
                Rectangle().fill(Palette.border).frame(height: 1)

                VStack(alignment: .leading, spacing: Space.s10) {
                    if let error { Text(error).font(Typeface.body(.bodySm)).foregroundStyle(Palette.danger) }
                    if let notice { Text(notice).font(Typeface.body(.bodySm)).foregroundStyle(Palette.mutedForeground) }
                    yours
                    start
                    deleted
                }
                .padding(.horizontal, Space.s4).padding(.vertical, Space.s8)
            }
            .foregroundStyle(Palette.ink)
        }
        .background(Palette.background)
        .navigationBarTitleDisplayMode(.inline)
        .refreshable { await load() }
        .task(id: account.member?.id) { await load() }
    }

    private func load() async {
        error = nil
        do { index = try await api.index() } catch { self.error = "Remix is unavailable. Please try again." }
        guard account.member != nil else { list = nil; return }
        do {
            let loaded = try await account.listRemixes()
            list = loaded
            // Each card's facts come from the server's calculator, as on the site.
            for formula in loaded.formulas where facts[formula.id] == nil {
                if let resolved = try? await api.resolve(formula.recipeSlug, state: formula.state) {
                    facts[formula.id] = resolved.valid ? resolved.facts : "Open to update this remix for the current recipe."
                }
            }
        } catch { self.error = error.localizedDescription }
    }

    private func title(_ slug: String) -> String { index?.recipes.first { $0.slug == slug }?.title ?? slug }

    @ViewBuilder
    private var yours: some View {
        if account.member == nil || list?.formulas.isEmpty == true {
            Text("No remixes yet. Start from a recipe below, change anything, then save it here.").font(Typeface.body(.lg))
        } else if let list {
            VStack(alignment: .leading, spacing: Space.s5) {
                heading("Your remixes", count: list.formulas.count)
                ForEach(list.formulas) { formula in
                    Button { open(formula.recipeSlug, formula.id) } label: {
                        VStack(alignment: .leading, spacing: Space.s1_5) {
                            Text(formula.name).font(Typeface.display(.xl, weight: .extrabold, relativeTo: .headline))
                            Text("From \(title(formula.recipeSlug))").font(Typeface.body(.sm)).foregroundStyle(Palette.mutedForeground)
                            Text(facts[formula.id] ?? " ").font(Typeface.body(.sm))
                            Label("Edited \(Self.ago(formula.updatedAt))", systemImage: "clock")
                                .font(Typeface.body(.xs)).foregroundStyle(Palette.mutedForeground).padding(.top, Space.s1_5)
                        }
                        .padding(Space.s5).frame(maxWidth: .infinity, alignment: .leading)
                        .background(Palette.card, in: .rect(cornerRadius: Radius.surface))
                        .overlay { RoundedRectangle(cornerRadius: Radius.surface).strokeBorder(Palette.border) }
                    }
                    .buttonStyle(.plain)
                    .contextMenu {
                        Button("Duplicate", systemImage: "plus.square.on.square") { Task { await run { _ = try await account.duplicateRemix(formula.id, name: "\(formula.name) copy") } } }
                        Button("Delete", systemImage: "trash", role: .destructive) {
                            Task { await run { _ = try await account.deleteRemix(formula.id); notice = "Deleted \(formula.name). It stays in Recently deleted for 30 days." } }
                        }
                    }
                }
            }
        }
    }

    @ViewBuilder
    private var start: some View {
        if let index {
            VStack(alignment: .leading, spacing: Space.s6) {
                HStack(spacing: Space.s4) {
                    Text("Start from a recipe").font(Typeface.display(.title, relativeTo: .title)).fixedSize().accessibilityAddTraits(.isHeader)
                    Rectangle().fill(Palette.border).frame(height: 1)
                }
                ForEach(index.recipes, id: \.slug) { recipe in
                    Button { open(recipe.slug, nil) } label: {
                        VStack(alignment: .leading, spacing: 0) {
                            if let image = index.images.additionalProperties[recipe.image] {
                                RemoteImage(variants: image.sources, aspectRatio: 1.5, alt: image.alt)
                            }
                            VStack(alignment: .leading, spacing: Space.s3) {
                                Text(recipe.title).font(Typeface.display(.xl, weight: .extrabold, relativeTo: .headline))
                                Text(recipe.facts).font(Typeface.body(.bodySm)).foregroundStyle(Palette.mutedForeground)
                                HStack(spacing: Space.s1_5) {
                                    Text("Start from this recipe").underline()
                                    SiteIcon.arrowRight.image.resizable().frame(width: 16, height: 16)
                                }
                                .font(Typeface.body(.bodySm, weight: .bold)).padding(.top, Space.s3)
                            }
                            .padding(Space.s5)
                        }
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .background(Palette.card)
                        .clipShape(.rect(cornerRadius: Radius.surface))
                    }
                    .buttonStyle(.plain)
                    .accessibilityIdentifier("remix-start-\(recipe.slug)")
                }
            }
        }
    }

    @ViewBuilder
    private var deleted: some View {
        if let list, !list.deleted.isEmpty {
            VStack(alignment: .leading, spacing: 0) {
                heading("Recently deleted", count: list.deleted.count).padding(.bottom, Space.s2)
                ForEach(list.deleted) { formula in
                    let confirming = confirmingPurge == formula.id
                    VStack(alignment: .leading, spacing: Space.s0_5) {
                        Text(confirming ? "Delete \(formula.name)?" : formula.name).font(Typeface.body(.base, weight: .bold))
                        Text(confirming ? "This can’t be undone." : "\(title(formula.recipeSlug)) · \(Self.ago(formula.deletedAt ?? formula.updatedAt))")
                            .font(Typeface.body(.sm)).foregroundStyle(Palette.mutedForeground)
                        HStack(spacing: Space.s6) {
                            if confirming {
                                Button("Cancel") { confirmingPurge = nil }
                                Button("Delete") { Task { await run { try await account.purgeRemix(formula.id); confirmingPurge = nil } } }.foregroundStyle(Palette.danger)
                            } else {
                                Button("Restore") { Task { await run { _ = try await account.undeleteRemix(formula.id) } } }
                                Button("Delete") { confirmingPurge = formula.id }.foregroundStyle(Palette.danger)
                            }
                        }
                        .font(Typeface.body(.sm, weight: .bold)).underline()
                        .frame(minHeight: 44)
                    }
                    .padding(.horizontal, Space.s3).padding(.vertical, Space.s2)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(confirming ? Palette.tint : .clear)
                    .overlay(alignment: .bottom) { Rectangle().fill(Palette.border).frame(height: 1) }
                }
            }
            .padding(.top, Space.s6)
            .overlay(alignment: .top) { Rectangle().fill(Palette.border).frame(height: 1) }
        }
    }

    private func heading(_ text: String, count: Int) -> some View {
        HStack(alignment: .firstTextBaseline, spacing: Space.s2) {
            Text(text).font(Typeface.display(.title, relativeTo: .title2)).accessibilityAddTraits(.isHeader)
            Text("\(count)").font(Typeface.body(.bodySm)).foregroundStyle(Palette.mutedForeground)
        }
    }

    private func run(_ action: () async throws -> Void) async {
        do { try await action(); await reload() } catch { self.error = error.localizedDescription }
    }
    private func reload() async { if let loaded = try? await account.listRemixes() { list = loaded } }

    static func ago(_ iso: String) -> String {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        guard let date = formatter.date(from: iso) ?? ISO8601DateFormatter().date(from: iso) else { return "" }
        return RelativeDateTimeFormatter().localizedString(for: date, relativeTo: .now)
    }
}
