// swift-tools-version: 6.2
import PackageDescription

let package = Package(
    name: "EatYeetUI",
    platforms: [.iOS(.v26)],
    products: [.library(name: "EatYeetUI", targets: ["EatYeetUI"])],
    dependencies: [.package(path: "../EatYeetCore")],
    targets: [.target(name: "EatYeetUI", dependencies: ["EatYeetCore"], resources: [.process("Icons.xcassets")])]
)
