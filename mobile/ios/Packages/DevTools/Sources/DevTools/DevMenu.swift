import EatYeetCore
import EatYeetUI
import SwiftUI
import UIKit

/// Developer settings that shape the whole UI (appearance and Dynamic Type overrides).
@MainActor
@Observable
public final class DevOverrides {
    public var colorScheme: ColorScheme?
    public var dynamicType: DynamicTypeSize?
    public init() {}
}

public struct DevMenu: View {
    @Environment(AppEnvironment.self) private var environment
    @Environment(FeatureFlags.self) private var flags
    @Environment(DevOverrides.self) private var overrides
    @Environment(\.dismiss) private var dismiss
    private let build: BuildInfo
    @State private var copied = false
    @State private var cacheCleared = false

    public init(build: BuildInfo) { self.build = build }

    public var body: some View {
        @Bindable var environment = environment
        @Bindable var flags = flags
        @Bindable var overrides = overrides
        NavigationStack {
            Form {
                Section("Backend") {
                    Picker("Environment", selection: $environment.backend) {
                        ForEach(BackendEnvironment.allCases) { Text($0.label).tag($0) }
                    }
                    LabeledContent("API base", value: environment.backend.baseURL.absoluteString)
                }
                Section("Build") {
                    LabeledContent("Commit", value: build.gitSHA + (build.dirty ? " (dirty)" : ""))
                    LabeledContent("Built", value: build.builtAt)
                }
                Section("Inspect") {
                    NavigationLink("Network log") { NetworkLogView() }
                    NavigationLink("MetricKit payloads") { MetricsView() }
                    Button(cacheCleared ? "Cache cleared" : "Clear cache") {
                        try? DiskCache.clear()
                        cacheCleared = true
                    }
                }
                Section("Layout") {
                    Toggle("Safe-area overlay", isOn: $flags.showSafeAreas)
                    Toggle("8 pt grid", isOn: $flags.showGrid)
                    Picker("Appearance", selection: $overrides.colorScheme) {
                        Text("System").tag(ColorScheme?.none)
                        Text("Light").tag(ColorScheme?.some(.light))
                        Text("Dark").tag(ColorScheme?.some(.dark))
                    }
                    Picker("Text size", selection: $overrides.dynamicType) {
                        Text("System").tag(DynamicTypeSize?.none)
                        Text("Large (default)").tag(DynamicTypeSize?.some(.large))
                        Text("XXX Large").tag(DynamicTypeSize?.some(.xxxLarge))
                        Text("Accessibility XL").tag(DynamicTypeSize?.some(.accessibility3))
                    }
                }
                Section {
                    Button(copied ? "Copied" : "Copy diagnostics") {
                        UIPasteboard.general.string = diagnostics()
                        copied = true
                    }
                }
            }
            .navigationTitle("Developer")
            .toolbar { Button("Done") { dismiss() } }
        }
    }

    private func diagnostics() -> String {
        let device = UIDevice.current
        var lines = [
            "Eat / Yeet \(build.summary)",
            "Backend: \(environment.backend.baseURL.absoluteString)",
            "Device: \(device.model) iOS \(device.systemVersion)",
            "Recent requests:",
        ]
        lines += NetworkLog.shared.entries.prefix(20).map {
            "  \($0.method) \($0.url.absoluteString) → \($0.status.map(String.init) ?? "error") \($0.milliseconds)ms"
        }
        lines.append("MetricKit payloads: \(MetricsStore.payloadFiles().count)")
        return lines.joined(separator: "\n")
    }
}

struct NetworkLogView: View {
    var body: some View {
        let log = NetworkLog.shared
        List(log.entries) { entry in
            VStack(alignment: .leading, spacing: 4) {
                Text("\(entry.method) \(entry.status.map(String.init) ?? "ERR") · \(entry.milliseconds) ms")
                    .font(.caption.monospaced())
                Text(entry.url.absoluteString).font(.caption2.monospaced()).lineLimit(2)
                Text(entry.bodyPreview).font(.caption2.monospaced()).foregroundStyle(.secondary).lineLimit(3)
            }
        }
        .overlay { if log.entries.isEmpty { ContentUnavailableView("No requests yet", systemImage: "network") } }
        .navigationTitle("Network")
        .toolbar { Button("Clear") { log.clear() } }
    }
}
