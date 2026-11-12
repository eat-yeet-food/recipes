import EatYeetAPI
import EatYeetUI
import SwiftUI

/// The site's segmented choice: a plum pill track, the selected option pink with a plum label.
struct PillPicker<Value: Hashable>: View {
    let options: [(Value, String)]
    @Binding var selection: Value
    var body: some View {
        HStack(spacing: 0) {
            ForEach(options, id: \.0) { value, label in
                Button {
                    withAnimation(.snappy(duration: 0.2)) { selection = value }
                } label: {
                    Text(label)
                        .font(Typeface.body(.bodySm, weight: .bold))
                        .foregroundStyle(selection == value ? Palette.ink : .white)
                        .frame(maxWidth: .infinity, minHeight: 40)
                        .background { if selection == value { Capsule().fill(Palette.brand) } }
                        .contentShape(.capsule)
                }
                .buttonStyle(.plain)
                .accessibilityAddTraits(selection == value ? .isSelected : [])
            }
        }
        .padding(Space.s1)
        .background(Palette.ink, in: .capsule)
        .sensoryFeedback(.selection, trigger: selection)
    }
}

/// A labelled number on an underline with its unit, as on the site's formula fields.
/// Typed text stays as typed until it parses; invalid text is flagged, never silently replaced.
struct NumberField: View {
    let label: String
    let unit: String
    let value: Double?
    let set: (Double) -> Void
    @State private var text = ""
    @FocusState private var focused: Bool

    private static func format(_ value: Double?) -> String {
        guard let value else { return "" }
        return value.rounded() == value ? String(Int(value)) : String(format: "%g", value)
    }

    var body: some View {
        VStack(alignment: .leading, spacing: Space.s2) {
            Text(label).font(Typeface.body(.bodySm, weight: .bold)).lineLimit(1).minimumScaleFactor(0.8)
            HStack(alignment: .firstTextBaseline) {
                TextField("", text: $text)
                    .keyboardType(.decimalPad)
                    .focused($focused)
                    .font(Typeface.body(.lg))
                    .onChange(of: text) { _, typed in
                        // Only a real edit writes; showing the current value must not.
                        if let number = Double(typed.replacingOccurrences(of: ",", with: ".")), number != value { set(number) }
                    }
                Text(unit).font(Typeface.body(.bodySm)).foregroundStyle(Palette.mutedForeground)
            }
            .padding(.bottom, Space.s2)
            .overlay(alignment: .bottom) {
                Rectangle().fill(invalid ? Palette.danger : Palette.input).frame(height: focused ? 2 : 1)
            }
        }
        .onAppear { text = Self.format(value) }
        .onChange(of: value) { _, newValue in if !focused { text = Self.format(newValue) } }
        .accessibilityElement(children: .combine)
        .accessibilityValue("\(text) \(unit)")
    }

    private var invalid: Bool { !text.isEmpty && Double(text.replacingOccurrences(of: ",", with: ".")) == nil }
}

struct RemixSectionTitle: View {
    let title: String
    var detail: String? = nil
    var body: some View {
        VStack(alignment: .leading, spacing: Space.s1) {
            Text(title).font(Typeface.display(.title, relativeTo: .title2)).accessibilityAddTraits(.isHeader)
            if let detail { Text(detail).font(Typeface.body(.bodySm)).foregroundStyle(Palette.mutedForeground) }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}

/// "REMIX" in the hero face over the short accent rule (the site's kitchen page band).
struct RemixBand: View {
    let title: String
    var body: some View {
        VStack(alignment: .leading, spacing: Space.s3) {
            Text(title.uppercased()).font(Typeface.hero(.display)).accessibilityAddTraits(.isHeader)
            LinearGradient(colors: [Palette.brand, Palette.brandAlt], startPoint: .leading, endPoint: .trailing)
                .frame(width: 64, height: 4).clipShape(.capsule).accessibilityHidden(true)
        }
    }
}
