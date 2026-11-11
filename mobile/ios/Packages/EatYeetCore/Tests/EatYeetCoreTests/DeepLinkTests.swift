import Foundation
import Testing
@testable import EatYeetCore

@Suite struct DeepLinkTests {
    @Test func parsesKnownLinks() {
        #expect(DeepLink(url: URL(string: "eatyeet://open")!) == .home)
        #expect(DeepLink(url: URL(string: "eatyeet://open/dev")!) == .dev)
        #expect(DeepLink(url: URL(string: "eatyeet://open/recipes/sourdough-bread")!) == .recipe(slug: "sourdough-bread"))
        #expect(DeepLink(url: URL(string: "eatyeet://open/recipes/pollo-asado/cook/2")!) == .cook(slug: "pollo-asado", step: 2))
        #expect(DeepLink(url: URL(string: "eatyeet://open/remix/local123")!) == .remix(id: "local123"))
    }

    @Test func rejectsOthers() {
        #expect(DeepLink(url: URL(string: "eatyeet://auth?code=x")!) == nil)
        #expect(DeepLink(url: URL(string: "https://open/recipes/x")!) == nil)
        #expect(DeepLink(url: URL(string: "eatyeet://open/recipes/x/cook/-1")!) == nil)
        #expect(DeepLink(url: URL(string: "eatyeet://open/nope")!) == nil)
    }

    @MainActor @Test func environmentPersists() {
        let defaults = UserDefaults(suiteName: "test.\(UUID())")!
        let env = AppEnvironment(defaults: defaults)
        env.backend = .production
        #expect(AppEnvironment(defaults: defaults).backend == .production)
    }
}
