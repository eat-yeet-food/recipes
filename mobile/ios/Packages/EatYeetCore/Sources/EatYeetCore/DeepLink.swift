import Foundation

/// Screens reachable through `eatyeet://open/...`. `eatyeet://auth` is reserved for sign-in.
public enum DeepLink: Equatable, Sendable {
    case home
    case recipe(slug: String)
    case cook(slug: String, step: Int)
    case remix(id: String)
    case dev

    public init?(url: URL) {
        guard url.scheme == "eatyeet", url.host() == "open" else { return nil }
        let parts = url.pathComponents.filter { $0 != "/" }
        switch parts.count {
        case 0:
            self = .home
        case 1 where parts[0] == "dev":
            self = .dev
        case 2 where parts[0] == "recipes":
            self = .recipe(slug: parts[1])
        case 2 where parts[0] == "remix":
            self = .remix(id: parts[1])
        case 4 where parts[0] == "recipes" && parts[2] == "cook":
            guard let step = Int(parts[3]), step >= 0 else { return nil }
            self = .cook(slug: parts[1], step: step)
        default:
            return nil
        }
    }
}
