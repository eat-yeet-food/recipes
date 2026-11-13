import XCTest

/// Captures stills for the promo reel: page screenshots taken a fixed drag apart (stitched into
/// one tall page afterwards) and one screenshot per tap state. All motion in the reel is then
/// animated from these stills, so nothing depends on the Simulator's recording frame rate.
/// Not part of the regular suites.
final class Reel: XCTestCase {
    private var directory: URL {
        let path = ProcessInfo.processInfo.environment["SHOTS_DIR"] ?? NSTemporaryDirectory()
        let url = URL(fileURLWithPath: path)
        try? FileManager.default.createDirectory(at: url, withIntermediateDirectories: true)
        return url
    }

    @MainActor private func launch(_ link: String) -> XCUIApplication {
        let app = XCUIApplication()
        var args = ["-openURL", link]
        if let origin = ProcessInfo.processInfo.environment["LOCAL_ORIGIN"] { args += ["-localOrigin", origin] }
        app.launchArguments = args
        app.launch()
        return app
    }

    @MainActor private func shot(_ app: XCUIApplication, _ name: String) {
        try? app.screenshot().pngRepresentation.write(to: directory.appending(path: "\(name).png"))
    }

    /// Screenshots down a page: drag 40% of the screen, hold before lifting so there is no fling.
    @MainActor private func page(_ app: XCUIApplication, _ name: String, count: Int) {
        shot(app, "\(name)-00")
        for index in 1...count {
            let start = app.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.7))
            let end = app.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.3))
            start.press(forDuration: 0.1, thenDragTo: end, withVelocity: 300, thenHoldForDuration: 0.6)
            sleep(2)  // images settle
            shot(app, String(format: "\(name)-%02d", index))
        }
    }

    @MainActor func testHome() {
        let app = launch("eatyeet://open")
        XCTAssertTrue(app.buttons["Open menu"].waitForExistence(timeout: 20))
        sleep(4)
        page(app, "home", count: 8)
    }

    @MainActor func testRecipe() {
        let app = launch("eatyeet://open/recipes/new-york-style-pizza")
        XCTAssertTrue(app.staticTexts["recipe-title"].waitForExistence(timeout: 20))
        sleep(4)
        page(app, "recipe", count: 8)
    }

    @MainActor func testCatalog() {
        let app = launch("eatyeet://open/recipes")
        XCTAssertTrue(app.buttons["recipe-card-pollo-asado"].waitForExistence(timeout: 20))
        sleep(4)
        page(app, "catalog", count: 8)
    }

    @MainActor func testCook() {
        let app = launch("eatyeet://open/recipes/classic-baked-mac-and-cheese/cook/1")
        let begin = app.buttons["cook-begin"]
        XCTAssertTrue(begin.waitForExistence(timeout: 20))
        sleep(3)
        shot(app, "cook-intro")
        begin.tap(); sleep(1)
        shot(app, "cook-gather-0")
        let boxes = app.buttons.matching(NSPredicate(format: "identifier BEGINSWITH 'cook-item-'"))
        for index in 0..<min(boxes.count, 4) {
            boxes.element(boundBy: index).tap(); usleep(400_000)
            shot(app, "cook-gather-\(index + 1)")
        }
        sleep(2)
        shot(app, "cook-gather-folded")
        app.buttons["cook-start"].tap(); sleep(2)
        for step in 1...12 {
            shot(app, String(format: "cook-step-%02d", step))
            guard app.buttons["cook-next"].exists else { break }
            app.buttons["cook-next"].tap(); sleep(1)
        }
    }

    @MainActor func testRemix() {
        let app = launch("eatyeet://open/remix")
        let start = app.buttons["remix-start-new-york-style-pizza"]
        XCTAssertTrue(start.waitForExistence(timeout: 20))
        start.tap()
        XCTAssertTrue(app.buttons["remix-review"].waitForExistence(timeout: 20))
        sleep(3)
        shot(app, "remix-0")
        for (index, size) in ["12″", "14″", "10″"].enumerated() where app.buttons[size].exists {
            app.buttons[size].tap(); sleep(1)
            shot(app, "remix-size-\(index + 1)")
        }
        if app.buttons["Indoor Steel"].exists { app.buttons["Indoor Steel"].tap(); sleep(1); shot(app, "remix-steel") }
        app.buttons["remix-review"].tap(); sleep(3)
        page(app, "bake", count: 3)
    }
}
