import EatYeetCore
import Observation
import SwiftUI

/// Turns deep links into navigation state.
@MainActor
@Observable
final class AppRouter {
    enum Route: Hashable {
        case recipe(slug: String)
        case cook(slug: String, step: Int)
        case remix(id: String)
    }

    var path: [Route] = []
    var showDevMenu = false

    func open(_ url: URL) {
        guard let link = DeepLink(url: url) else { return }
        showDevMenu = false
        switch link {
        case .home: path = []
        case .dev: path = []; showDevMenu = true
        case .recipe(let slug): path = [.recipe(slug: slug)]
        case .cook(let slug, let step): path = [.recipe(slug: slug), .cook(slug: slug, step: step)]
        case .remix(let id): path = [.remix(id: id)]
        }
    }
}
