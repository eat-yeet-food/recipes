// swift-tools-version: 6.2
import PackageDescription

let package = Package(
    name: "EatYeetCore",
    platforms: [.iOS(.v26)],
    products: [.library(name: "EatYeetCore", targets: ["EatYeetCore"])],
    targets: [
        .target(name: "EatYeetCore"),
        .testTarget(name: "EatYeetCoreTests", dependencies: ["EatYeetCore"]),
    ]
)
