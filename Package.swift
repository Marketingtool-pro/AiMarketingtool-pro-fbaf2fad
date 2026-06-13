// swift-tools-version: 6.1
// The swift-tools-version declares the minimum version of Swift required to build this package.

import PackageDescription

let package = Package(
    name: "MyCLI",
    platforms: [
        .macOS(.v13)
    ],
    products: [
        .executable(name: "mycli", targets: ["MyCLI"]),
        .library(name: "MyCLICore", targets: ["MyCLICore"]) 
    ],
    dependencies: [
        // Add external package dependencies here, for example:
        // .package(url: "https://github.com/apple/swift-argument-parser", from: "1.2.0")
    ],
    targets: [
        .executableTarget(
            name: "MyCLI",
            dependencies: [
                // .product(name: "ArgumentParser", package: "swift-argument-parser"),
                "MyCLICore"
            ]
        ),
        .target(
            name: "MyCLICore",
            dependencies: []
        ),
        .testTarget(
            name: "MyCLITests",
            dependencies: ["MyCLICore"]
        )
    ]
)
