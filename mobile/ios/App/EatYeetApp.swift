import Catalog
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

    init() {
        MetricsStore.shared.start()
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

    var body: some View {
        @Bindable var router = router
        NavigationStack(path: $router.path) {
            CatalogScreen(build: .current)
                .navigationDestination(for: AppRouter.Route.self, destination: destination)
                .onAppear { Perf.signposter.emitEvent(Perf.launchContent) }
        }
        .background(ThreeFingerLongPress { router.showDevMenu = true })
        .sheet(isPresented: $router.showDevMenu) { DevMenu(build: .current) }
    }

    @ViewBuilder
    private func destination(_ route: AppRouter.Route) -> some View {
        switch route {
        case .recipe(let slug):
            PendingScreen(title: "Recipe", detail: "\(slug) — milestone 2")
        case .cook(let slug, let step):
            PendingScreen(title: "Cook mode", detail: "\(slug), step \(step) — milestone 3")
        case .remix(let id):
            PendingScreen(title: "Remix", detail: "\(id) — milestone 6")
        }
    }
}
