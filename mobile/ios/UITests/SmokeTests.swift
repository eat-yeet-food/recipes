import XCTest

final class SmokeTests: XCTestCase {
    @MainActor func testLaunchShowsBuildBanner() {
        let app = XCUIApplication()
        app.launch()
        XCTAssertTrue(app.staticTexts["build-banner"].waitForExistence(timeout: 10))
    }

    @MainActor func testAccessibilityAuditHome() throws {
        let app = XCUIApplication()
        app.launch()
        try app.performAccessibilityAudit()
    }
}
