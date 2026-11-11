import Foundation

/// Git identity of this build. The app target's pre-build script writes `BuildInfo.current`.
public struct BuildInfo: Sendable, Equatable {
    public let gitSHA: String
    public let dirty: Bool
    public let builtAt: String

    public init(gitSHA: String, dirty: Bool, builtAt: String) {
        self.gitSHA = gitSHA
        self.dirty = dirty
        self.builtAt = builtAt
    }

    public var summary: String { "\(gitSHA)\(dirty ? "+dirty" : "") · \(builtAt)" }
}
