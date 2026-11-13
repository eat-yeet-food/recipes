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
        case account
        case remixLibrary
        case remix(slug: String, formulaId: String? = nil)
    }

    /// The tab bar: each tab keeps its own back stack.
    enum Tab: Hashable { case home, recipes, remix, account, search }

    var tab: Tab = .home
    var paths: [Tab: [Route]] = [:]
    var showDevMenu = false

    /// The selected tab's stack.
    var path: [Route] {
        get { paths[tab] ?? [] }
        set { paths[tab] = newValue }
    }

    func binding(_ tab: Tab) -> Binding<[Route]> {
        Binding(get: { self.paths[tab] ?? [] }, set: { self.paths[tab] = $0 })
    }

    /// Shows a tab at its root (or pushes onto it with `then`).
    func show(_ tab: Tab, _ routes: [Route] = []) {
        self.tab = tab
        paths[tab] = routes
    }

    /// A site path from the menu (`/search`, `/remix`), as the matching deep link.
    func open(_ href: String) {
        if href == "/" { show(.home); return }
        if let url = URL(string: "eatyeet://open" + href) { open(url) }
    }

    func open(_ url: URL) {
        guard let link = DeepLink(url: url) else { return }
        showDevMenu = false
        switch link {
        case .home: show(.home)
        case .catalog: show(.recipes)
        case .account: show(.account)
        case .dev: showDevMenu = true
        case .recipe(let slug): show(.recipes, [.recipe(slug: slug)])
        case .cook(let slug, _): show(.recipes, [.recipe(slug: slug, cooking: true)])
        case .remix(let id): show(.remix, id.isEmpty ? [] : [.remix(slug: id)])
        }
    }
}
