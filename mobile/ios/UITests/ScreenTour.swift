import XCTest

/// Visits representative screens and saves full-resolution screenshots for `pnpm ios:shots`
/// and `pnpm ios:parity`. The Simulator shares the Mac's filesystem, so PNGs go straight
/// to $SHOTS_DIR (default dist/ios/shots). Baselines are only updated when the owner asks.
final class ScreenTour: XCTestCase {
    private var directory: URL {
        let env = ProcessInfo.processInfo.environment
        let path = env["SHOTS_DIR"] ?? env["SIMULATOR_HOST_HOME"].map { $0 + "/src/recipes/dist/ios/shots" } ?? NSTemporaryDirectory()
        let url = URL(fileURLWithPath: path)
        try? FileManager.default.createDirectory(at: url, withIntermediateDirectories: true)
        return url
    }

    private func launch(_ link: String) -> XCUIApplication {
        let app = XCUIApplication()
        var args = ["-openURL", link]
        if let origin = ProcessInfo.processInfo.environment["LOCAL_ORIGIN"] { args += ["-localOrigin", origin] }
        app.launchArguments = args
        app.launch()
        return app
    }

    private func save(_ app: XCUIApplication, _ name: String) {
        let data = app.screenshot().pngRepresentation
        try? data.write(to: directory.appending(path: "\(name).png"))
        let attachment = XCTAttachment(data: data, uniformTypeIdentifier: "public.png")
        attachment.name = name
        attachment.lifetime = .keepAlways
        add(attachment)
    }

    @MainActor func testCatalog() {
        let app = launch("eatyeet://open")
        XCTAssertTrue(app.buttons["recipe-card-pollo-asado"].waitForExistence(timeout: 15))
        sleep(2)
        save(app, "catalog")
    }

    @MainActor func testRecipePages() {
        for slug in ["sourdough-bread", "new-york-style-pizza", "brown-butter-chocolate-chunk-cookies"] {
            let app = launch("eatyeet://open/recipes/\(slug)")
            XCTAssertTrue(app.staticTexts["recipe-title"].waitForExistence(timeout: 15), slug)
            sleep(2)
            save(app, "recipe-\(slug)-1")
            for page in 2...4 {
                app.swipeUp(velocity: .slow)
                sleep(1)
                save(app, "recipe-\(slug)-\(page)")
            }
            app.terminate()
        }
    }
}
