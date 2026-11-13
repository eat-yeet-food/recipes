import Foundation
import SwiftUI

/// Renders the small HTML subset authored content uses (strong/b, em/i, a, br, entities)
/// as an AttributedString. Other tags are dropped, keeping their text.
public enum InlineHTML {
    /// `boldFont` sets `<strong>` runs explicitly: a bold trait on a custom font can land on the
    /// same face as the surrounding text (Avenir has no Bold; 600 and 700 are both Heavy).
    public static func attributed(_ html: String, linkColor: Color = Palette.ink, boldFont: Font? = nil) -> AttributedString {
        var result = AttributedString()
        var bold = 0, italic = 0
        var link: URL?
        var index = html.startIndex
        var text = ""

        func flush() {
            guard !text.isEmpty else { return }
            var run = AttributedString(decodeEntities(text))
            var intent: InlinePresentationIntent = []
            if bold > 0 { intent.insert(.stronglyEmphasized) }
            if italic > 0 { intent.insert(.emphasized) }
            if !intent.isEmpty { run.inlinePresentationIntent = intent }
            if bold > 0, let boldFont { run.font = boldFont }
            if let link {
                run.link = link
                run.underlineStyle = .single
                run.foregroundColor = linkColor
            }
            result += run
            text = ""
        }

        while index < html.endIndex {
            if html[index] == "<", let close = html[index...].firstIndex(of: ">") {
                flush()
                let tag = html[html.index(after: index)..<close].trimmingCharacters(in: .whitespaces)
                let closing = tag.hasPrefix("/")
                let name = tag.drop(while: { $0 == "/" }).prefix(while: { $0.isLetter }).lowercased()
                switch name {
                case "strong", "b": bold += closing ? -1 : 1
                case "em", "i": italic += closing ? -1 : 1
                case "br": text = "\n"; flush()
                case "a":
                    if closing { link = nil }
                    else if let range = tag.range(of: #"href\s*=\s*"([^"]*)""#, options: .regularExpression) {
                        let href = tag[range].split(separator: "\"", omittingEmptySubsequences: false).dropFirst().first.map(String.init) ?? ""
                        link = URL(string: decodeEntities(href))
                    }
                default: break
                }
                bold = max(bold, 0); italic = max(italic, 0)
                index = html.index(after: close)
            } else {
                text.append(html[index])
                index = html.index(after: index)
            }
        }
        flush()
        return result
    }

    /// A step's bold lead without its colon: "<strong>Simmer:</strong> Cover…" → "Simmer".
    public static func leadingBold(_ html: String) -> String? {
        guard let match = html.firstMatch(of: /^\s*<(?:strong|b)>([^<]+?):?\s*<\/(?:strong|b)>/) else { return nil }
        let lead = decodeEntities(String(match.1)).trimmingCharacters(in: .whitespaces)
        return lead.isEmpty ? nil : lead
    }

    public static func plain(_ html: String) -> String { String(attributed(html).characters) }

    static func decodeEntities(_ value: String) -> String {
        guard value.contains("&") else { return value }
        var out = value
        for (entity, char) in [("&amp;", "&"), ("&lt;", "<"), ("&gt;", ">"), ("&quot;", "\""), ("&#39;", "'"), ("&apos;", "'"), ("&nbsp;", "\u{00A0}"), ("&ndash;", "–"), ("&mdash;", "—"), ("&deg;", "°")] {
            out = out.replacingOccurrences(of: entity, with: char)
        }
        while let range = out.range(of: #"&#(x?)([0-9a-fA-F]+);"#, options: .regularExpression) {
            let body = out[range].dropFirst(2).dropLast()
            let scalar = body.hasPrefix("x") ? UInt32(body.dropFirst(), radix: 16) : UInt32(body)
            out.replaceSubrange(range, with: scalar.flatMap(Unicode.Scalar.init).map { String(Character($0)) } ?? "")
        }
        return out
    }
}

/// Authored HTML in the body face at one size, with `<strong>` in the site's bold face.
public struct HTMLText: View {
    let html: String
    let size: TextSize
    public init(_ html: String, size: TextSize = .base) { self.html = html; self.size = size }
    public var body: some View {
        Text(InlineHTML.attributed(html, boldFont: Typeface.body(size, weight: .bold))).font(Typeface.body(size))
    }
}
