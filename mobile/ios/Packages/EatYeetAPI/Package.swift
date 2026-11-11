// swift-tools-version: 6.2
import PackageDescription

// Client generated at build time from packages/l3/app-api/openapi.yaml (symlinked).
let package = Package(
    name: "EatYeetAPI",
    platforms: [.iOS(.v26)],
    products: [.library(name: "EatYeetAPI", targets: ["EatYeetAPI"])],
    dependencies: [
        .package(path: "../EatYeetCore"),
        .package(url: "https://github.com/apple/swift-openapi-generator", from: "1.6.0"),
        .package(url: "https://github.com/apple/swift-openapi-runtime", from: "1.7.0"),
        .package(url: "https://github.com/apple/swift-openapi-urlsession", from: "1.0.0"),
    ],
    targets: [
        .target(
            name: "EatYeetAPI",
            dependencies: [
                "EatYeetCore",
                .product(name: "OpenAPIRuntime", package: "swift-openapi-runtime"),
                .product(name: "OpenAPIURLSession", package: "swift-openapi-urlsession"),
            ],
            plugins: [.plugin(name: "OpenAPIGenerator", package: "swift-openapi-generator")]
        ),
    ]
)
