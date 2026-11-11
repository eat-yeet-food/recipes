import Catalog
import EatYeetCore
import Observation
import SwiftUI

/// Turns deep links into navigation state.
@MainActor
@Observable
final class AppRouter {
    enum Route: Hashable {
        case recipe(slug: String, cooking: Bool = false)
        case catalog(category: HomeCategory? = nil, search: Bool = false)
        case remix(id: String)
    }

    var path: [Route] = []
    var showDevMenu = false

    /// A site path from the menu (`/search`, `/remix`), as the matching deep link.
    func open(_ href: String) {
        if let url = URL(string: "eatyeet://open" + href) { open(url) }
    }

    func open(_ url: URL) {
        guard let link = DeepLink(url: url) else { return }
        showDevMenu = false
        switch link {
        case .home: path = []
        case .catalog: path = [.catalog()]
        case .dev: path = []; showDevMenu = true
        case .recipe(let slug): path = [.recipe(slug: slug)]
        case .cook(let slug, _): path = [.recipe(slug: slug, cooking: true)]
        case .remix(let id): path = [.remix(id: id)]
        }
    }
}
