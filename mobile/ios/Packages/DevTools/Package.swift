// swift-tools-version: 6.2
import PackageDescription

let package = Package(
    name: "DevTools",
    platforms: [.iOS(.v26)],
    products: [.library(name: "DevTools", targets: ["DevTools"])],
    dependencies: [.package(path: "../EatYeetCore"), .package(path: "../EatYeetUI")],
    targets: [.target(name: "DevTools", dependencies: ["EatYeetCore", "EatYeetUI"])]
)
