import Account
import Catalog
import EatYeetAPI
import FeatureSupport
import Recipe
import DevTools
import EatYeetCore
import EatYeetUI
import SwiftUI
import UIKit

@main
struct EatYeetApp: App {
    @State private var environment = AppEnvironment()
    @State private var flags = FeatureFlags()
    @State private var overrides = DevOverrides()
    @State private var router = AppRouter()
    @State private var store: RecipeStore
    @State private var account: AccountStore

    init() {
        MetricsStore.shared.start()
        Self.useSiteFonts()
        let environment = AppEnvironment()
        _environment = State(initialValue: environment)
        _store = State(initialValue: RecipeStore(backend: environment.backend))
        _account = State(initialValue: AccountStore(backend: environment.backend))
    }

    /// UIKit-drawn text (bar titles and bar buttons) defaults to SF; give it the site's Avenir too.
    private static func useSiteFonts() {
        let title = UIFont(name: "Avenir-Black", size: TextSize.lg.rawValue) ?? .boldSystemFont(ofSize: TextSize.lg.rawValue)
        let item = UIFont(name: "Avenir-Medium", size: TextSize.lg.rawValue) ?? .systemFont(ofSize: TextSize.lg.rawValue)
        UINavigationBar.appearance().titleTextAttributes = [.font: UIFontMetrics(forTextStyle: .headline).scaledFont(for: title)]
        UINavigationBar.appearance().largeTitleTextAttributes = [.font: UIFontMetrics(forTextStyle: .largeTitle).scaledFont(for: UIFont(name: "Avenir-Black", size: TextSize.section.rawValue) ?? title)]
        UITabBarItem.appearance().setTitleTextAttributes([.font: UIFont(name: "Avenir-Medium", size: TextSize.micro.rawValue) ?? .systemFont(ofSize: TextSize.micro.rawValue)], for: .normal)
        UIBarButtonItem.appearance().setTitleTextAttributes([.font: UIFontMetrics(forTextStyle: .body).scaledFont(for: item)], for: .normal)
    }

    var body: some Scene {
        WindowGroup {
            RootView()
                .modifier(LayoutOverlays())
                .preferredColorScheme(overrides.colorScheme)
                .modifier(DynamicTypeOverride(size: overrides.dynamicType))
                .tint(Palette.ink)
                // Anything without its own font (plain buttons, fields, alerts) still reads as the site.
                .font(Typeface.body())
                .onOpenURL { router.open($0) }
                .task {
                    // Developer tooling launches with `-openURL <link>` (no system prompt).
                    if let link = UserDefaults.standard.string(forKey: "openURL"), let url = URL(string: link) {
                        router.open(url)
                    }
                }
                .onReceive(NotificationCenter.default.publisher(for: .deviceDidShake)) { _ in router.showDevMenu = true }
                .environment(environment)
                .environment(flags)
                .environment(overrides)
                .environment(router)
                .environment(store)
                .environment(account)
                .task { await account.refresh() }
                // Timers are the system's: pick up any still running (or ringing) from before.
                .task { KitchenTimers.shared.watch() }
                .onChange(of: environment.backend) { _, backend in store.use(backend); account.use(backend) }
        }
    }
}

private struct DynamicTypeOverride: ViewModifier {
    let size: DynamicTypeSize?
    func body(content: Content) -> some View {
        if let size { content.dynamicTypeSize(size) } else { content }
    }
}

struct RootView: View {
    @Environment(AppRouter.self) private var router
    @Environment(AccountStore.self) private var account
    @Environment(AppEnvironment.self) private var environment
    @Environment(\.openURL) private var openURL
    @State private var hero = RecipeHero()
    @State private var showingTimers = false
    @State private var timers = KitchenTimers.shared

    var body: some View {
        @Bindable var router = router
        TabView(selection: $router.tab) {
            Tab("Home", systemImage: "house", value: AppRouter.Tab.home) {
                stack(.home) { HomeScreen(go: go) }
            }
            Tab("Recipes", systemImage: "book", value: AppRouter.Tab.recipes) {
                stack(.recipes) { screen(.catalog()).toolbar(.hidden, for: .navigationBar) }
            }
            Tab("Remix", systemImage: "slider.horizontal.3", value: AppRouter.Tab.remix) {
                stack(.remix) { screen(.remixLibrary).toolbar(.hidden, for: .navigationBar) }
            }
            Tab("Account", systemImage: "person.crop.circle", value: AppRouter.Tab.account) {
                stack(.account) { screen(.account).toolbar(.hidden, for: .navigationBar) }
            }
            Tab(value: AppRouter.Tab.search, role: .search) {
                stack(.search) { screen(.catalog(search: true)).toolbar(.hidden, for: .navigationBar) }
            }
        }
        // Pink marks the selected tab over white, plum and photos alike; screens keep the ink tint.
        .tint(Palette.brand)
        .tabBarMinimizeBehavior(.onScrollDown)
        .environment(hero)
        .background(ThreeFingerLongPress { router.showDevMenu = true })
        .sheet(isPresented: $router.showDevMenu) { DevMenu(build: .current) }
        .sheet(isPresented: $showingTimers) { TimersSheet() }
    }

    /// One tab's navigation stack, with every app route pushable onto it.
    private func stack(_ tab: AppRouter.Tab, @ViewBuilder root: () -> some View) -> some View {
        NavigationStack(path: router.binding(tab)) {
            root().navigationDestination(for: AppRouter.Route.self) { screen($0) }
        }
        // The app-wide timers bar, above the tab bar on every screen of every tab while timers exist.
        .safeAreaInset(edge: .bottom, spacing: 0) {
            if !timers.entries.isEmpty { TimersAccessory { showingTimers = true } }
        }
        // Recipes opened from a card grow out of it over this tab (the tab bar stays on top).
        .overlay { RecipeHeroLayer(scope: "\(tab)") { RecipeScreen(slug: $0) } }
        .tint(Palette.ink)
    }

    /// From a card: the hand-off over the current tab. (Deep links still push the page.)
    private func openRecipe(_ slug: String) {
        hero.open(slug, scope: "\(router.tab)")
    }

    /// Where the home page's header, menu and sections lead.
    private func go(_ destination: HomeDestination) {
        switch destination {
        case .recipe(let slug): openRecipe(slug)
        case .catalog(let category): router.path.append(.catalog(category: category))
        case .search: router.show(.search)
        case .path(let href): router.open(href)
        case .account: router.show(.account)
        case .signOut: Task { await account.signOut() }
        case .web(let path): openURL(environment.backend.baseURL.appending(path: path))
        case .home: router.show(.home)
        }
    }

    @ViewBuilder
    private func screen(_ route: AppRouter.Route) -> some View {
        switch route {
        case .recipe(let slug, let cooking):
            RecipeScreen(slug: slug, cooking: cooking)
        case .catalog(let category, let search):
            CatalogScreen(category: category, search: search) { openRecipe($0) }
        case .account:
            AccountScreen()
        case .remixLibrary:
            RemixLibraryScreen { slug, formulaId in router.path.append(.remix(slug: slug, formulaId: formulaId)) }
        case .remix(let slug, let formulaId):
            RemixEditorScreen(slug: slug, formulaId: formulaId)
        }
    }
}

