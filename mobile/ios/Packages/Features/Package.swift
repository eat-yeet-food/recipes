// swift-tools-version: 6.2
import PackageDescription

// Feature modules. Each may depend on EatYeetUI, EatYeetCore and EatYeetAPI, never on the app.
let package = Package(
    name: "Features",
    platforms: [.iOS(.v26)],
    products: [
        .library(name: "Catalog", targets: ["Catalog"]),
        .library(name: "Recipe", targets: ["Recipe"]),
        .library(name: "FeatureSupport", targets: ["FeatureSupport"]),
        .library(name: "Account", targets: ["Account"]),
    ],
    dependencies: [.package(path: "../EatYeetCore"), .package(path: "../EatYeetUI"), .package(path: "../EatYeetAPI")],
    targets: [
        .target(name: "FeatureSupport", dependencies: ["EatYeetCore", "EatYeetUI", "EatYeetAPI"]),
        .target(name: "Catalog", dependencies: ["FeatureSupport", "EatYeetCore", "EatYeetUI", "EatYeetAPI"]),
        .target(name: "Account", dependencies: ["FeatureSupport", "EatYeetUI", "EatYeetAPI"]),
        .target(name: "Recipe", dependencies: ["FeatureSupport", "EatYeetCore", "EatYeetUI", "EatYeetAPI"]),
    ]
)
