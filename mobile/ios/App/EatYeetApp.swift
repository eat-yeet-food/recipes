import Catalog
import EatYeetAPI
import FeatureSupport
import Recipe
import DevTools
import EatYeetCore
import EatYeetUI
import SwiftUI

@main
struct EatYeetApp: App {
    @State private var environment = AppEnvironment()
    @State private var flags = FeatureFlags()
    @State private var overrides = DevOverrides()
    @State private var router = AppRouter()
    @State private var store: RecipeStore

    init() {
        MetricsStore.shared.start()
        let environment = AppEnvironment()
        _environment = State(initialValue: environment)
        _store = State(initialValue: RecipeStore(backend: environment.backend))
    }

    var body: some Scene {
        WindowGroup {
            RootView()
                .modifier(LayoutOverlays())
                .preferredColorScheme(overrides.colorScheme)
                .modifier(DynamicTypeOverride(size: overrides.dynamicType))
                .tint(Palette.ink)
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
                .onChange(of: environment.backend) { _, backend in store.use(backend) }
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
    @Namespace private var zoom

    var body: some View {
        @Bindable var router = router
        NavigationStack(path: $router.path) {
            HomeScreen(zoom: zoom) { destination in
                switch destination {
                case .recipe(let slug): router.path.append(.recipe(slug: slug))
                case .catalog(let category): router.path.append(.catalog(category: category))
                case .search: router.path.append(.catalog(search: true))
                case .path(let href): router.open(href)
                }
            }
                .navigationDestination(for: AppRouter.Route.self, destination: destination)
        }
        .background(ThreeFingerLongPress { router.showDevMenu = true })
        .sheet(isPresented: $router.showDevMenu) { DevMenu(build: .current) }
    }

    @ViewBuilder
    private func destination(_ route: AppRouter.Route) -> some View {
        switch route {
        case .recipe(let slug, let cooking):
            RecipeScreen(slug: slug, cooking: cooking)
                .navigationTransition(.zoom(sourceID: slug, in: zoom))
        case .catalog(let category, let search):
            CatalogScreen(category: category, search: search, zoom: zoom) { router.path.append(.recipe(slug: $0)) }
                .navigationTitle(category?.label ?? "")
                .navigationBarTitleDisplayMode(.inline)
        case .remix(let id):
            PendingScreen(title: "Remix", detail: "\(id) — milestone 6")
        }
    }
}
