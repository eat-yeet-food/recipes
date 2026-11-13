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
    @State private var pillAway = false
    @State private var baking = false

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
        .sheet(isPresented: $reviewing, onDismiss: { pillAway = false }) {
            if let resolution {
                DoughDrawer(resolution: resolution, status: formula == nil ? "" : saveStatus,
                            onReset: { if let recipe { state = recipe.defaultState } }) { dockAction }
            }
        }
        .sheet(isPresented: $baking) {
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
            VStack(alignment: .leading, spacing: Space.s9) {
                VStack(alignment: .leading, spacing: Space.s2) {
                    Text("Name").font(Typeface.body(.bodySm, weight: .bold)).foregroundStyle(Palette.mutedForeground)
                    TextField("Name", text: $name)
                        .font(Typeface.display(.section, relativeTo: .largeTitle))
                        .padding(.bottom, Space.s1_5)
                        .overlay(alignment: .bottom) { Rectangle().fill(Palette.ink).frame(height: Stroke.rule) }
                        .onSubmit { if formula != nil { Task { await save() } } }
                    Text("From \(recipe.title)").font(Typeface.body(.base))
                }

                if recipe.methods.count > 1 {
                    VStack(alignment: .leading, spacing: Space.s4) {
                        RemixSectionTitle(title: pizza ? "Oven" : "Method")
                        PillPicker(options: recipe.methods.map { ($0.id, $0.label) }, selection: string("methodId"))
                    }
                }

                VStack(alignment: .leading, spacing: Space.s5) {
                    RemixSectionTitle(title: "Size", detail: "Choose how many to make on the bake sheet.")
                    Grid(horizontalSpacing: Space.s6, verticalSpacing: Space.s5) {
                        GridRow {
                            NumberField(label: pizza ? "Pizzas" : "Loaves", unit: "", value: number("batch", "count")) { set(.number(max(1, $0.rounded())), "batch", "count") }
                            NumberField(label: pizza ? "Ball weight" : "Loaf weight", unit: "g", value: number("batch", "pieceWeightGrams")) {
                                set(.number($0), "batch", "pieceWeightGrams"); set(nil, "batch", "diameterInches")
                            }
                        }
                    }
                    if pizza, !recipe.pizzaSizes.isEmpty {
                        VStack(alignment: .leading, spacing: Space.s2) {
                            Text("Pizza size").font(Typeface.body(.bodySm, weight: .bold))
                            PillPicker(options: recipe.pizzaSizes.map { ($0.inches, "\(Int($0.inches))″") }, selection: Binding(
                                get: { number("batch", "diameterInches") ?? 0 },
                                set: { inches in
                                    set(.number(inches), "batch", "diameterInches")
                                    if let size = recipe.pizzaSizes.first(where: { $0.inches == inches }) { set(.number(size.ballGrams), "batch", "pieceWeightGrams") }
                                }))
                        }
                    }
                }

                VStack(alignment: .leading, spacing: Space.s5) {
                    RemixSectionTitle(title: "Formula", detail: "Baker’s percentages of the total flour.")
                    flours
                    Grid(horizontalSpacing: Space.s6, verticalSpacing: Space.s5) {
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
                    Text(resolution.errors.joined(separator: " ")).font(Typeface.body(.sm)).foregroundStyle(Palette.danger)
                }
            }
            .padding(.horizontal, Space.s5).padding(.top, Space.s2).padding(.bottom, Space.s20)
        }
        .scrollDismissesKeyboard(.interactively)
        .overlay(alignment: .bottom) { reviewPill }
    }

    private var flours: some View {
        VStack(alignment: .leading, spacing: Space.s3) {
            let list = state[path: "formula", "flour"]?.array ?? []
            ForEach(Array(list.indices), id: \.self) { index in
                HStack(alignment: .bottom, spacing: Space.s4) {
                    VStack(alignment: .leading, spacing: Space.s2) {
                        Text("Flour").font(Typeface.body(.bodySm, weight: .bold))
                        TextField("Flour", text: Binding(
                            get: { list[safe: index]?["name"]?.string ?? "" },
                            set: { setFlour(index, "name", .string(String($0.prefix(80)))) }))
                            .font(Typeface.body(.lg)).padding(.bottom, Space.s2)
                            .overlay(alignment: .bottom) { Rectangle().fill(Palette.input).frame(height: Stroke.hairline) }
                    }
                    NumberField(label: "Share", unit: "%", value: list[safe: index]?["percent"]?.number) { setFlour(index, "percent", .number($0)) }
                        .frame(width: Measure.amountField)
                    if list.count > 1 {
                        Button { removeFlour(index) } label: { Image(systemName: "trash").frame(width: Space.target, height: Space.target).background(Palette.muted, in: .circle) }
                            .accessibilityLabel("Remove flour")
                    }
                }
            }
            if list.count < 20 {
                Button {
                    var flour = state[path: "formula", "flour"]?.array ?? []
                    flour.append(.object(["id": .string("flour-\(UUID().uuidString.prefix(8).lowercased())"), "name": .string("Flour"), "percent": .number(0)]))
                    set(.array(flour), "formula", "flour")
                } label: { Label("Add flour", systemImage: "plus").font(Typeface.body(.bodySm, weight: .bold)).underline() }
            }
        }
    }

    private var pizzaProcess: some View {
        VStack(alignment: .leading, spacing: Space.s5) {
            RemixSectionTitle(title: "Mixing and fermentation", detail: "Times count from when you start mixing.")
            PillPicker(options: [("spiral", "Mixer"), ("food-processor", "Processor"), ("hand", "By hand")], selection: string("formula", "pizzaProcess", "mixingMethod"))
            Grid(horizontalSpacing: Space.s6, verticalSpacing: Space.s5) {
                GridRow {
                    NumberField(label: "Dough temperature", unit: "°F", value: number("formula", "pizzaProcess", "bulkTemperatureF")) { set(.number($0), "formula", "pizzaProcess", "bulkTemperatureF") }
                    NumberField(label: "Divide and ball at", unit: "h", value: number("formula", "pizzaProcess", "bulkMinutes").map { $0 / 60 }) { set(.number(($0 * 60).rounded()), "formula", "pizzaProcess", "bulkMinutes") }
                }
            }
            VStack(alignment: .leading, spacing: Space.s2) {
                Text("Cold ferment").font(Typeface.body(.bodySm, weight: .bold))
                PillPicker(options: [(2.0, "2 days"), (3.0, "3 days"), (4.0, "4 days")], selection: Binding(
                    get: { number("formula", "pizzaProcess", "coldDays") ?? 2 },
                    set: { days in
                        set(.number(days), "formula", "pizzaProcess", "coldDays")
                        // Longer in the refrigerator, shorter to come up to temperature (as on the site).
                        set(.number(days <= 2 ? 240 : days == 3 ? 180 : 120), "formula", "pizzaProcess", "warmUpMinutes")
                    }))
                Text("Warm-up follows the cold ferment: 4h after 2 days, 3h after 3, 2h after 4.")
                    .font(Typeface.body(.sm)).foregroundStyle(Palette.mutedForeground)
            }
        }
    }

    private var sourdoughProcess: some View {
        VStack(alignment: .leading, spacing: Space.s5) {
            RemixSectionTitle(title: "Mixing and fermentation", detail: "Times count from when you start mixing.")
            PillPicker(options: [("spiral", "Mixer"), ("hand", "By hand")], selection: string("formula", "process", "mixingMethod"))
            Grid(horizontalSpacing: Space.s6, verticalSpacing: Space.s5) {
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
                .font(Typeface.body(.sm)).foregroundStyle(Palette.mutedForeground)
        }
    }

    /// The site's phone dock: a small ink Review pill at the bottom right; tapping or swiping it up
    /// drops it away and raises the Your dough drawer.
    private var reviewPill: some View {
        Button(action: presentReview) {
            HStack(spacing: Space.s2) {
                Text("Review")
                Image(systemName: "chevron.up").font(Typeface.icon(IconSize.xs, weight: .bold))
            }
            .font(Typeface.action(.base)).foregroundStyle(Palette.white)
            .padding(.horizontal, Space.s5).frame(minHeight: Control.regular)
            .background(Palette.ink, in: .capsule)
            .elevation(.overlay)
        }
        .buttonStyle(.plain)
        .simultaneousGesture(DragGesture(minimumDistance: Travel.swipe).onEnded { if $0.translation.height < -Travel.swipe { presentReview() } })
        .offset(y: pillAway ? Measure.pillDrop : 0)
        .animation(.easeOut(duration: Motion.quick), value: pillAway)
        .disabled(resolution?.valid != true)
        .accessibilityLabel("Review your dough: \(resolution?.total ?? ""), \(resolution?.totalDetail ?? "")\(changeSuffix)")
        .accessibilityIdentifier("remix-review")
        .padding(.horizontal, Space.s4).padding(.bottom, Space.s4)
        .frame(maxWidth: .infinity, alignment: .trailing)
    }

    private var changeSuffix: String {
        let count = resolution?.changes.count ?? 0
        return count == 0 ? "" : " · \(count) \(count == 1 ? "change" : "changes")"
    }

    private func presentReview() {
        guard !pillAway, resolution?.valid == true else { return }
        UIImpactFeedbackGenerator(style: .light).impactOccurred()
        pillAway = true
        Task { try? await Task.sleep(for: .seconds(Motion.quick)); reviewing = true }
    }

    /// The drawer's action, as on the site: Save on an unsaved remix, Apply (the bake sheet) on a saved one.
    @ViewBuilder private var dockAction: some View {
        if formula == nil {
            Button(account.member == nil ? "Sign in to save" : "Save") { reviewing = false; Task { await saveNew() } }
                .buttonStyle(OnDarkPill())
        } else {
            Button("Apply") {
                reviewing = false
                Task { try? await Task.sleep(for: .seconds(Motion.sheet)); baking = true }
            }
            .buttonStyle(OnDarkPill())
        }
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
                .padding(.horizontal, Space.s4).padding(.vertical, Space.s6)
            }
            .background(Palette.background)
            .toolbar { ToolbarItem(placement: .topBarTrailing) { Button("Done") { dismiss() } } }
        }
    }

    private var content: some View {
                VStack(alignment: .leading, spacing: Space.s8) {
                    VStack(alignment: .leading, spacing: Space.s2) {
                        Text(title).font(Typeface.display(.section, relativeTo: .largeTitle))
                        Text(resolution.facts).font(Typeface.body(.bodySm)).foregroundStyle(Palette.mutedForeground)
                        HStack(alignment: .firstTextBaseline, spacing: Space.s2) {
                            Text(resolution.total).font(Typeface.body(.title, weight: .bold)).monospacedDigit()
                            Text(resolution.totalDetail).font(Typeface.body(.sm)).foregroundStyle(Palette.mutedForeground)
                        }
                    }
                    if !resolution.changes.isEmpty {
                        VStack(alignment: .leading, spacing: Space.s2) {
                            Eyebrow("Changed from the recipe")
                            ForEach(Array(resolution.changes.enumerated()), id: \.offset) { _, change in
                                ChangeLine(label: change.label, from: change.from, to: change.to)
                            }
                        }
                        .padding(Space.s4).frame(maxWidth: .infinity, alignment: .leading)
                        .background(Palette.brandSoft, in: .rect(cornerRadius: Radius.field))
                    }
                    if let recipe = resolution.recipe {
                        ForEach(Array(recipe.blocks.enumerated()), id: \.offset) { _, block in
                            VStack(alignment: .leading, spacing: Space.s10) {
                                if !block.ingredients.isEmpty { IngredientsCard(sections: block.ingredients) }
                                if !block.steps.isEmpty { StepsView(sections: block.steps) }
                            }
                        }
                    }
                }
    }
}

/// The site's DoughDock drawer: ink, "Your dough" with the pink total and the action, then the
/// weights, the schedule and what changed from the recipe.
struct DoughDrawer<Action: View>: View {
    let resolution: RemixResolution
    let status: String
    let onReset: () -> Void
    @ViewBuilder let action: () -> Action

    private var detail: String {
        let count = resolution.changes.count
        let changes = count == 0 ? "" : " · \(count) \(count == 1 ? "change" : "changes")"
        return resolution.totalDetail + changes + (status.isEmpty ? "" : " · \(status)")
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            HStack(alignment: .center, spacing: Space.s3) {
                VStack(alignment: .leading, spacing: 0) {
                    Text("Your dough").font(Typeface.action(.xs)).textCase(.uppercase)
                        .tracking(Tracking.eyebrow(.xs)).foregroundStyle(Palette.brand)
                    HStack(alignment: .firstTextBaseline, spacing: Space.s2) {
                        Text(resolution.total).font(Typeface.action(.xxl)).monospacedDigit().foregroundStyle(Palette.brand).fixedSize()
                        Text(detail).font(Typeface.body(.caption)).lineLimit(1).truncationMode(.tail)
                    }
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                action()
            }
            .padding(.horizontal, Space.s4).padding(.top, Space.s6).padding(.bottom, Space.s4)
            ScrollView {
                VStack(alignment: .leading, spacing: Space.s4) {
                    if let summary = resolution.summary { results(summary) }
                    changes
                }
                .padding(.horizontal, Space.s4).padding(.bottom, Space.s4)
            }
        }
        .foregroundStyle(Palette.onDarkLabel)
        .presentationDetents([.medium, .large])
        .presentationDragIndicator(.visible)
        .presentationBackground(Palette.ink)
        .presentationCornerRadius(Radius.surface)
    }

    private func results(_ summary: Components.Schemas.RemixSummary) -> some View {
        VStack(alignment: .leading, spacing: Space.s4) {
            VStack(spacing: 0) {
                ForEach(Array(summary.rows.enumerated()), id: \.offset) { _, row in
                    HStack(alignment: .firstTextBaseline, spacing: Space.s4) {
                        Text(row.label).frame(maxWidth: .infinity, alignment: .leading)
                        HStack(alignment: .firstTextBaseline, spacing: Space.s1_5) {
                            if let detail = row.detail { Text(detail).font(Typeface.body(.caption)) }
                            Text(row.amount).font(Typeface.action(.bodySm)).monospacedDigit()
                        }
                    }
                    .font(Typeface.body(.bodySm))
                    .padding(.vertical, Space.s2_5)
                    .overlay(alignment: .top) { Rectangle().fill(Palette.borderOnDark).frame(height: Stroke.hairline) }
                }
            }
            if !summary.schedule.isEmpty {
                VStack(alignment: .leading, spacing: Space.s1) {
                    Text("Schedule").font(Typeface.action(.xs)).textCase(.uppercase).tracking(Tracking.eyebrow(.xs)).padding(.top, Space.s2)
                    ForEach(Array(summary.schedule.enumerated()), id: \.offset) { _, row in
                        HStack(alignment: .firstTextBaseline, spacing: Space.s3) {
                            Text(row.time).font(Typeface.action(.sm)).monospacedDigit()
                                .foregroundStyle(row.problem == nil ? Palette.brand : Palette.danger).frame(width: Measure.timeColumn, alignment: .leading)
                            Text(row.problem.map { "\(row.label). \($0)" } ?? row.label).font(Typeface.body(.sm))
                                .frame(maxWidth: .infinity, alignment: .leading)
                        }
                        .padding(row.problem == nil ? 0 : Space.s2)
                        .padding(.vertical, row.problem == nil ? Space.s2 : 0)
                        .foregroundStyle(row.problem == nil ? Palette.onDarkLabel : Palette.ink)
                        .background(row.problem == nil ? Color.clear : Palette.dangerSoft, in: .rect(cornerRadius: Radius.filter))
                        .overlay(alignment: .top) { if row.problem == nil { Rectangle().fill(Palette.borderOnDark).frame(height: Stroke.hairline) } }
                    }
                }
            }
            if let note = summary.note {
                Text(note).font(Typeface.body(.caption)).padding(.top, Space.s3)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .overlay(alignment: .top) { Rectangle().fill(Palette.borderOnDark).frame(height: Stroke.hairline) }
            }
        }
    }

    /// The site's ChangeStrip in its ink tone.
    private var changes: some View {
        let count = resolution.changes.count
        return VStack(alignment: .leading, spacing: Space.s1) {
            Text(count == 1 ? "1 change from the recipe" : count > 0 ? "\(count) changes from the recipe" : "Changed from the recipe")
                .font(Typeface.action(.xs)).textCase(.uppercase).tracking(Tracking.eyebrow(.xs)).foregroundStyle(Palette.brand)
            if count == 0 {
                Text("Nothing yet. This matches the recipe.").font(Typeface.body(.sm))
            } else {
                ForEach(Array(resolution.changes.enumerated()), id: \.offset) { index, change in
                    VStack(alignment: .leading, spacing: Space.s0_5) {
                        HStack(alignment: .firstTextBaseline, spacing: Space.s3) {
                            Text(change.label).font(Typeface.body(.bodySm)).frame(maxWidth: .infinity, alignment: .leading)
                            Text(change.to).font(Typeface.action(.bodySm)).foregroundStyle(Palette.white).multilineTextAlignment(.trailing)
                        }
                        Text("was \(change.from)").font(Typeface.body(.caption)).foregroundStyle(Palette.onDarkMuted).lineLimit(1)
                    }
                    .padding(.vertical, Space.s3)
                    .overlay(alignment: .bottom) { if index < count - 1 { Rectangle().fill(Palette.borderOnDark).frame(height: Stroke.hairline) } }
                }
                Button(action: onReset) {
                    Label("Reset to recipe", systemImage: "arrow.uturn.backward").font(Typeface.action(.sm))
                }
                .buttonStyle(.plain).padding(.top, Space.s2)
            }
        }
        .padding(.top, Space.s2)
    }
}

/// The site's on-dark button: pink fill, ink label.
struct OnDarkPill: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(Typeface.action(.sm)).foregroundStyle(Palette.ink).lineLimit(1)
            .padding(.horizontal, Space.s4).frame(minHeight: Space.target)
            .background(configuration.isPressed ? Palette.brandSoft : Palette.brand, in: .capsule)
    }
}

struct OutlinePill: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(Typeface.body(.base, weight: .semibold)).foregroundStyle(Palette.ink)
            .padding(.horizontal, Space.s5).frame(minHeight: Control.regular)
            .background(configuration.isPressed ? Palette.tint : Palette.background, in: .capsule)
            .overlay { Capsule().strokeBorder(Palette.ink, lineWidth: Stroke.control) }
    }
}

struct TrailingIcon: LabelStyle {
    func makeBody(configuration: Configuration) -> some View {
        HStack(spacing: Space.s2) { configuration.title; configuration.icon }
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
        let head: Text = Text(label + ": ").fontWeight(.black)
        let tail: Text = Text(from + " → ")
        let value: Text = Text(to).fontWeight(.black)
        return (head + tail + value).font(Typeface.body(.bodySm))
    }
}
