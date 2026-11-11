import EatYeetAPI
import EatYeetCore
import EatYeetUI
import FeatureSupport
import SwiftUI

/// Remix's editor for a dough formula (the site's /remix/<recipe>[/<formula>]). The app edits the
/// fields below and keeps the rest of the state as it was; every number is checked and calculated
/// by the server (resolve). Saved remixes autosave with the revision the edit started from.
public struct RemixEditorScreen: View {
    @Environment(AppEnvironment.self) private var environment
    @Environment(AccountStore.self) private var account
    let slug: String
    let formulaId: String?

    @State private var recipe: RemixRecipe?
    @State private var formula: KitchenFormula?
    @State private var state: JSONValue = .null
    @State private var name = ""
    @State private var resolution: RemixResolution?
    @State private var loadError: String?
    @State private var saveStatus = ""
    @State private var conflict: String?
    @State private var reviewing = false

    public init(slug: String, formulaId: String? = nil) {
        self.slug = slug
        self.formulaId = formulaId
    }

    private var api: RemixAPI { RemixAPI(base: environment.backend.baseURL) }

    public var body: some View {
        Group {
            if let recipe { editor(recipe) }
            else if let loadError { LoadFailure(message: loadError) { await load() } }
            else { ProgressView().frame(maxWidth: .infinity, maxHeight: .infinity) }
        }
        .background(Palette.background)
        .foregroundStyle(Palette.ink)
        .navigationBarTitleDisplayMode(.inline)
        .task { await load() }
        // Recalculate after edits settle; save a saved remix once they do.
        .task(id: state) {
            guard recipe != nil, state != .null else { return }
            try? await Task.sleep(for: .milliseconds(250))
            guard !Task.isCancelled else { return }
            resolution = try? await api.resolve(slug, state: state)
            guard formula != nil, resolution?.valid == true else { return }
            try? await Task.sleep(for: .seconds(1.2))
            guard !Task.isCancelled else { return }
            await save()
        }
        .alert("Remix changed elsewhere", isPresented: .constant(conflict != nil)) {
            Button("Reload") { conflict = nil; Task { await load() } }
        } message: { Text(conflict ?? "") }
        .sheet(isPresented: $reviewing) {
            if let resolution, let recipe { RemixBakeSheet(title: name.isEmpty ? recipe.title : name, resolution: resolution, images: recipe.images) }
        }
    }

    private func load() async {
        loadError = nil
        do {
            let loaded = try await api.recipe(slug)
            if let formulaId {
                let saved = try await account.readRemix(formulaId)
                formula = saved; state = saved.state; name = saved.name
            } else {
                state = loaded.defaultState; name = loaded.title
            }
            recipe = loaded
        } catch {
            loadError = error.localizedDescription
        }
    }

    private func save() async {
        guard let current = formula else { return }
        saveStatus = "Saving…"
        do {
            formula = try await account.saveRemix(current, name: name, state: state)
            saveStatus = "Saved"
        } catch KitchenSaveError.conflict(let message) {
            conflict = message; saveStatus = ""
        } catch {
            saveStatus = error.localizedDescription
        }
    }

    private func saveNew() async {
        guard account.member != nil else { try? await account.signIn(); return }
        saveStatus = "Saving…"
        do {
            formula = try await account.createRemix(recipeSlug: slug, name: name, state: state)
            name = formula?.name ?? name
            saveStatus = "Saved"
        } catch { saveStatus = error.localizedDescription }
    }

    // MARK: Editor

    private func editor(_ recipe: RemixRecipe) -> some View {
        let pizza = recipe.family == "pizza"
        return ScrollView {
            VStack(alignment: .leading, spacing: 36) {
                VStack(alignment: .leading, spacing: 8) {
                    Text("Name").font(Typeface.body(15, weight: .bold)).foregroundStyle(Palette.mutedForeground)
                    TextField("Name", text: $name)
                        .font(Typeface.display(34, relativeTo: .largeTitle))
                        .padding(.bottom, 6)
                        .overlay(alignment: .bottom) { Rectangle().fill(Palette.ink).frame(height: 2) }
                        .onSubmit { if formula != nil { Task { await save() } } }
                    Text("From \(recipe.title)").font(Typeface.body(16))
                }

                if recipe.methods.count > 1 {
                    VStack(alignment: .leading, spacing: 16) {
                        RemixSectionTitle(title: pizza ? "Oven" : "Method")
                        PillPicker(options: recipe.methods.map { ($0.id, $0.label) }, selection: string("methodId"))
                    }
                }

                VStack(alignment: .leading, spacing: 20) {
                    RemixSectionTitle(title: "Size", detail: "Choose how many to make on the bake sheet.")
                    Grid(horizontalSpacing: 24, verticalSpacing: 20) {
                        GridRow {
                            NumberField(label: pizza ? "Pizzas" : "Loaves", unit: "", value: number("batch", "count")) { set(.number(max(1, $0.rounded())), "batch", "count") }
                            NumberField(label: pizza ? "Ball weight" : "Loaf weight", unit: "g", value: number("batch", "pieceWeightGrams")) {
                                set(.number($0), "batch", "pieceWeightGrams"); set(nil, "batch", "diameterInches")
                            }
                        }
                    }
                    if pizza, !recipe.pizzaSizes.isEmpty {
                        VStack(alignment: .leading, spacing: 8) {
                            Text("Pizza size").font(Typeface.body(15, weight: .bold))
                            PillPicker(options: recipe.pizzaSizes.map { ($0.inches, "\(Int($0.inches))″") }, selection: Binding(
                                get: { number("batch", "diameterInches") ?? 0 },
                                set: { inches in
                                    set(.number(inches), "batch", "diameterInches")
                                    if let size = recipe.pizzaSizes.first(where: { $0.inches == inches }) { set(.number(size.ballGrams), "batch", "pieceWeightGrams") }
                                }))
                        }
                    }
                }

                VStack(alignment: .leading, spacing: 20) {
                    RemixSectionTitle(title: "Formula", detail: "Baker’s percentages of the total flour.")
                    flours
                    Grid(horizontalSpacing: 24, verticalSpacing: 20) {
                        GridRow {
                            percent("Hydration", "hydrationPercent")
                            percent("Salt", "saltPercent")
                        }
                        GridRow {
                            if pizza { percent("Yeast", "yeastPercent") } else { percent("Levain", "levainPercent") }
                            percent("Sugar", "sugarPercent")
                        }
                        GridRow {
                            percent("Oil", "oilPercent")
                            percent("Malt powder", "maltPercent")
                        }
                    }
                }

                if pizza, state[path: "formula", "pizzaProcess"] != nil { pizzaProcess }
                if !pizza, state[path: "formula", "process"] != nil { sourdoughProcess }

                if let resolution, !resolution.valid {
                    Text(resolution.errors.joined(separator: " ")).font(Typeface.body(14)).foregroundStyle(Palette.danger)
                }
            }
            .padding(.horizontal, 20).padding(.top, 16).padding(.bottom, 120)
        }
        .scrollDismissesKeyboard(.interactively)
        .safeAreaInset(edge: .bottom) { footer }
    }

    private var flours: some View {
        VStack(alignment: .leading, spacing: 12) {
            let list = state[path: "formula", "flour"]?.array ?? []
            ForEach(Array(list.indices), id: \.self) { index in
                HStack(alignment: .bottom, spacing: 16) {
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Flour").font(Typeface.body(15, weight: .bold))
                        TextField("Flour", text: Binding(
                            get: { list[safe: index]?["name"]?.string ?? "" },
                            set: { setFlour(index, "name", .string(String($0.prefix(80)))) }))
                            .font(Typeface.body(17)).padding(.bottom, 8)
                            .overlay(alignment: .bottom) { Rectangle().fill(Palette.input).frame(height: 1) }
                    }
                    NumberField(label: "Share", unit: "%", value: list[safe: index]?["percent"]?.number) { setFlour(index, "percent", .number($0)) }
                        .frame(width: 96)
                    if list.count > 1 {
                        Button { removeFlour(index) } label: { Image(systemName: "trash").frame(width: 44, height: 44).background(Palette.muted, in: .circle) }
                            .accessibilityLabel("Remove flour")
                    }
                }
            }
            if list.count < 20 {
                Button {
                    var flour = state[path: "formula", "flour"]?.array ?? []
                    flour.append(.object(["id": .string("flour-\(UUID().uuidString.prefix(8).lowercased())"), "name": .string("Flour"), "percent": .number(0)]))
                    set(.array(flour), "formula", "flour")
                } label: { Label("Add flour", systemImage: "plus").font(Typeface.body(15, weight: .bold)).underline() }
            }
        }
    }

    private var pizzaProcess: some View {
        VStack(alignment: .leading, spacing: 20) {
            RemixSectionTitle(title: "Mixing and fermentation", detail: "Times count from when you start mixing.")
            PillPicker(options: [("spiral", "Mixer"), ("food-processor", "Processor"), ("hand", "By hand")], selection: string("formula", "pizzaProcess", "mixingMethod"))
            Grid(horizontalSpacing: 24, verticalSpacing: 20) {
                GridRow {
                    NumberField(label: "Dough temperature", unit: "°F", value: number("formula", "pizzaProcess", "bulkTemperatureF")) { set(.number($0), "formula", "pizzaProcess", "bulkTemperatureF") }
                    NumberField(label: "Divide and ball at", unit: "h", value: number("formula", "pizzaProcess", "bulkMinutes").map { $0 / 60 }) { set(.number(($0 * 60).rounded()), "formula", "pizzaProcess", "bulkMinutes") }
                }
            }
            VStack(alignment: .leading, spacing: 8) {
                Text("Cold ferment").font(Typeface.body(15, weight: .bold))
                PillPicker(options: [(2.0, "2 days"), (3.0, "3 days"), (4.0, "4 days")], selection: Binding(
                    get: { number("formula", "pizzaProcess", "coldDays") ?? 2 },
                    set: { days in
                        set(.number(days), "formula", "pizzaProcess", "coldDays")
                        // Longer in the refrigerator, shorter to come up to temperature (as on the site).
                        set(.number(days <= 2 ? 240 : days == 3 ? 180 : 120), "formula", "pizzaProcess", "warmUpMinutes")
                    }))
                Text("Warm-up follows the cold ferment: 4h after 2 days, 3h after 3, 2h after 4.")
                    .font(Typeface.body(14)).foregroundStyle(Palette.mutedForeground)
            }
        }
    }

    private var sourdoughProcess: some View {
        VStack(alignment: .leading, spacing: 20) {
            RemixSectionTitle(title: "Mixing and fermentation", detail: "Times count from when you start mixing.")
            PillPicker(options: [("spiral", "Mixer"), ("hand", "By hand")], selection: string("formula", "process", "mixingMethod"))
            Grid(horizontalSpacing: 24, verticalSpacing: 20) {
                GridRow {
                    NumberField(label: "Autolyse", unit: "min", value: number("formula", "process", "autolyseMinutes")) { set(.number($0.rounded()), "formula", "process", "autolyseMinutes") }
                    NumberField(label: "Bulk", unit: "h", value: number("formula", "process", "bulkMinutes").map { $0 / 60 }) { set(.number(($0 * 60).rounded()), "formula", "process", "bulkMinutes") }
                }
                GridRow {
                    NumberField(label: "Bulk temperature", unit: "°F", value: number("formula", "process", "bulkTemperatureF")) { set(.number($0), "formula", "process", "bulkTemperatureF") }
                    Color.clear.gridCellUnsizedAxes([.horizontal, .vertical])
                }
            }
            Text("Folds and shaping follow the recipe; edit them on eatyeet.com.")
                .font(Typeface.body(14)).foregroundStyle(Palette.mutedForeground)
        }
    }

    private var footer: some View {
        HStack(spacing: 12) {
            VStack(alignment: .leading, spacing: 2) {
                Text(resolution?.total ?? " ").lineLimit(1).fixedSize().font(Typeface.body(17, weight: .bold)).monospacedDigit()
                Text(formula == nil ? (resolution?.facts ?? "") : saveStatus).font(Typeface.body(12)).foregroundStyle(Palette.mutedForeground).lineLimit(1)
            }
            Spacer()
            if formula == nil {
                Button(account.member == nil ? "Sign in to save" : "Save") { Task { await saveNew() } }
                    .buttonStyle(OutlinePill())
                    .lineLimit(1).fixedSize()
                    .disabled(resolution?.valid != true)
            }
            Button { reviewing = true } label: { Label("Review", systemImage: "chevron.up").labelStyle(TrailingIcon()) }
                .buttonStyle(PrimaryButtonStyle())
                .lineLimit(1).fixedSize()
                .disabled(resolution?.valid != true)
                .accessibilityIdentifier("remix-review")
        }
        .padding(.horizontal, 20).padding(.vertical, 12)
        .background(.bar)
    }

    // MARK: State access

    private func number(_ keys: String...) -> Double? { keys.reduce(Optional(state)) { $0?[$1] }?.number }
    private func set(_ value: JSONValue?, _ keys: String...) { state = Self.setting(state, keys[...], value) }
    private static func setting(_ value: JSONValue, _ keys: ArraySlice<String>, _ newValue: JSONValue?) -> JSONValue {
        guard let key = keys.first, case .object(var o) = value else { return newValue ?? value }
        if keys.count == 1 { o[key] = newValue } else { o[key] = setting(o[key] ?? .object([:]), keys.dropFirst(), newValue) }
        return .object(o)
    }
    private func string(_ keys: String...) -> Binding<String> {
        Binding(get: { keys.reduce(Optional(state)) { $0?[$1] }?.string ?? "" }, set: { state = Self.setting(state, keys[...], .string($0)) })
    }
    private func percent(_ label: String, _ key: String) -> some View {
        NumberField(label: label, unit: "%", value: number("formula", key)) { set(.number($0), "formula", key) }
    }
    private func setFlour(_ index: Int, _ key: String, _ value: JSONValue) {
        guard var list = state[path: "formula", "flour"]?.array, list.indices.contains(index) else { return }
        list[index][key] = value
        set(.array(list), "formula", "flour")
    }
    private func removeFlour(_ index: Int) {
        guard var list = state[path: "formula", "flour"]?.array, list.indices.contains(index) else { return }
        list.remove(at: index)
        set(.array(list), "formula", "flour")
    }
}

/// The resolved bake sheet: totals, what changed from the recipe, then ingredients and steps.
struct RemixBakeSheet: View {
    let title: String
    let resolution: RemixResolution
    let images: [String: Components.Schemas.Image]
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            ScrollView {
                content
                .foregroundStyle(Palette.ink)
                .padding(.horizontal, 18).padding(.vertical, 24)
            }
            .background(Palette.background)
            .toolbar { ToolbarItem(placement: .topBarTrailing) { Button("Done") { dismiss() } } }
        }
    }

    private var content: some View {
                VStack(alignment: .leading, spacing: 32) {
                    VStack(alignment: .leading, spacing: 8) {
                        Text(title).font(Typeface.display(34, relativeTo: .largeTitle))
                        Text(resolution.facts).font(Typeface.body(15)).foregroundStyle(Palette.mutedForeground)
                        HStack(alignment: .firstTextBaseline, spacing: 8) {
                            Text(resolution.total).font(Typeface.body(28, weight: .bold)).monospacedDigit()
                            Text(resolution.totalDetail).font(Typeface.body(14)).foregroundStyle(Palette.mutedForeground)
                        }
                    }
                    if !resolution.changes.isEmpty {
                        VStack(alignment: .leading, spacing: 8) {
                            Eyebrow("Changed from the recipe")
                            ForEach(Array(resolution.changes.enumerated()), id: \.offset) { _, change in
                                ChangeLine(label: change.label, from: change.from, to: change.to)
                            }
                        }
                        .padding(16).frame(maxWidth: .infinity, alignment: .leading)
                        .background(Palette.brandSoft, in: .rect(cornerRadius: Radius.field))
                    }
                    if let recipe = resolution.recipe {
                        ForEach(Array(recipe.blocks.enumerated()), id: \.offset) { _, block in
                            VStack(alignment: .leading, spacing: 40) {
                                if !block.ingredients.isEmpty { IngredientsCard(sections: block.ingredients) }
                                if !block.steps.isEmpty { StepsView(sections: block.steps) }
                            }
                        }
                    }
                }
    }
}

struct OutlinePill: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.headline).foregroundStyle(Palette.ink)
            .padding(.horizontal, 20).frame(minHeight: 48)
            .background(configuration.isPressed ? Palette.tint : Palette.background, in: .capsule)
            .overlay { Capsule().strokeBorder(Palette.ink, lineWidth: 1.5) }
    }
}

struct TrailingIcon: LabelStyle {
    func makeBody(configuration: Configuration) -> some View {
        HStack(spacing: 8) { configuration.title; configuration.icon }
    }
}

extension Array {
    subscript(safe index: Int) -> Element? { indices.contains(index) ? self[index] : nil }
}

private struct ChangeLine: View {
    let label: String
    let from: String
    let to: String
    var body: some View {
        let head: Text = Text(label + ": ").bold()
        let tail: Text = Text(from + " → ")
        let value: Text = Text(to).bold()
        return (head + tail + value).font(Typeface.body(15))
    }
}
