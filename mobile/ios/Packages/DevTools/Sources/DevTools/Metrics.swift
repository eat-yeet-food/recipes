import Foundation
import MetricKit
import SwiftUI

/// Saves MetricKit payloads (launch, hangs, hitches) from real use to Application Support.
public final class MetricsStore: NSObject, MXMetricManagerSubscriber, @unchecked Sendable {
    public static let shared = MetricsStore()

    static var directory: URL {
        URL.applicationSupportDirectory.appending(path: "metrickit", directoryHint: .isDirectory)
    }

    public func start() { MXMetricManager.shared.add(self) }

    public func didReceive(_ payloads: [MXMetricPayload]) {
        save(payloads.map { $0.jsonRepresentation() }, prefix: "metrics")
    }

    public func didReceive(_ payloads: [MXDiagnosticPayload]) {
        save(payloads.map { $0.jsonRepresentation() }, prefix: "diagnostics")
    }

    private func save(_ blobs: [Data], prefix: String) {
        try? FileManager.default.createDirectory(at: Self.directory, withIntermediateDirectories: true)
        let stamp = Int(Date().timeIntervalSince1970)
        for (index, blob) in blobs.enumerated() {
            try? blob.write(to: Self.directory.appending(path: "\(prefix)-\(stamp)-\(index).json"))
        }
    }

    static func payloadFiles() -> [URL] {
        let files = (try? FileManager.default.contentsOfDirectory(at: directory, includingPropertiesForKeys: nil)) ?? []
        return files.sorted { $0.lastPathComponent > $1.lastPathComponent }
    }
}

struct MetricsView: View {
    var body: some View {
        let files = MetricsStore.payloadFiles()
        List(files, id: \.self) { file in
            NavigationLink(file.lastPathComponent) {
                ScrollView {
                    Text((try? String(contentsOf: file, encoding: .utf8)) ?? "")
                        .font(.caption2.monospaced()).padding()
                }
            }
        }
        .overlay { if files.isEmpty { ContentUnavailableView("No payloads yet", systemImage: "chart.xyaxis.line", description: Text("iOS delivers MetricKit data about once a day.")) } }
        .navigationTitle("MetricKit")
    }
}
