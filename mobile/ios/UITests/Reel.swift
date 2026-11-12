import XCTest

/// Drives short, smooth scenes for the promo reel (`scratch: record while each test runs`).
/// Each scene writes `<name>.start` (epoch seconds) once its content is on screen, so the
/// recording can be trimmed to the moment the scene is ready. Not part of the regular suites.
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

    private func mark(_ name: String) {
        try? String(Date().timeIntervalSince1970).write(to: directory.appending(path: "\(name).start"), atomically: true, encoding: .utf8)
    }

    /// A slow, natural finger scroll.
    @MainActor private func glide(_ app: XCUIApplication, by fraction: CGFloat = 0.45, velocity: XCUIGestureVelocity = 600) {
        let start = app.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.78))
        let end = app.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.78 - fraction))
        start.press(forDuration: 0.05, thenDragTo: end, withVelocity: velocity, thenHoldForDuration: 0.15)
    }

    @MainActor func testHome() {
        let app = launch("eatyeet://open")
        XCTAssertTrue(app.buttons["Open menu"].waitForExistence(timeout: 20))
        sleep(3)
        mark("home")
        sleep(2)
        for _ in 0..<4 { glide(app, by: 0.4, velocity: 500); usleep(500_000) }
        sleep(1)
    }

    @MainActor func testRecipe() {
        let app = launch("eatyeet://open/recipes/new-york-style-pizza")
        XCTAssertTrue(app.staticTexts["recipe-title"].waitForExistence(timeout: 20))
        sleep(3)
        mark("recipe")
        sleep(2)
        for _ in 0..<4 { glide(app, by: 0.4, velocity: 450); usleep(500_000) }
        sleep(1)
    }

    @MainActor func testCook() {
        let app = launch("eatyeet://open/recipes/new-york-style-pizza/cook/1")
        let begin = app.buttons["cook-begin"]
        XCTAssertTrue(begin.waitForExistence(timeout: 20))
        sleep(3)
        mark("cook")
        sleep(1)
        begin.tap()
        sleep(1)
        let boxes = app.buttons.matching(NSPredicate(format: "identifier BEGINSWITH 'cook-item-'"))
        for index in 0..<min(boxes.count, 4) { boxes.element(boundBy: index).tap(); usleep(450_000) }
        sleep(2)
        app.buttons["cook-start"].tap()
        sleep(2)
        app.buttons["cook-next"].tap()
        sleep(2)
    }

    @MainActor func testRemix() {
        let app = launch("eatyeet://open/remix")
        let start = app.buttons["remix-start-new-york-style-pizza"]
        XCTAssertTrue(start.waitForExistence(timeout: 20))
        start.tap()
        XCTAssertTrue(app.buttons["remix-review"].waitForExistence(timeout: 20))
        sleep(3)
        mark("remix")
        sleep(1)
        for size in ["12″", "14″", "10″"] where app.buttons[size].exists { app.buttons[size].tap(); usleep(900_000) }
        if app.buttons["Indoor Steel"].exists { app.buttons["Indoor Steel"].tap(); usleep(900_000) }
        glide(app, by: 0.35, velocity: 450)
        sleep(1)
        app.buttons["remix-review"].tap()
        sleep(2)
        glide(app, by: 0.4, velocity: 450)
        sleep(2)
    }

    @MainActor func testCatalog() {
        let app = launch("eatyeet://open/recipes")
        XCTAssertTrue(app.buttons["recipe-card-pollo-asado"].waitForExistence(timeout: 20))
        sleep(3)
        mark("catalog")
        sleep(1)
        for _ in 0..<4 { glide(app, by: 0.5, velocity: 700); usleep(400_000) }
        sleep(1)
    }
}
