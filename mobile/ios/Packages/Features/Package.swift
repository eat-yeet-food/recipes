// swift-tools-version: 6.2
import PackageDescription

// Feature modules. Each may depend on EatYeetUI, EatYeetCore and (from M2) EatYeetAPI.
let package = Package(
    name: "Features",
    platforms: [.iOS(.v26)],
    products: [.library(name: "Catalog", targets: ["Catalog"])],
    dependencies: [.package(path: "../EatYeetCore"), .package(path: "../EatYeetUI")],
    targets: [.target(name: "Catalog", dependencies: ["EatYeetCore", "EatYeetUI"])]
)
