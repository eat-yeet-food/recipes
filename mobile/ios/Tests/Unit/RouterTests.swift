import Foundation
import Testing
@testable import EatYeet

@MainActor @Suite struct RouterTests {
    @Test func cookLinkPushesRecipeThenCook() {
        let router = AppRouter()
        router.open(URL(string: "eatyeet://open/recipes/sourdough-bread/cook/3")!)
        #expect(router.path == [.recipe(slug: "sourdough-bread"), .cook(slug: "sourdough-bread", step: 3)])
    }

    @Test func devLinkOpensMenu() {
        let router = AppRouter()
        router.open(URL(string: "eatyeet://open/dev")!)
        #expect(router.showDevMenu)
    }
}
