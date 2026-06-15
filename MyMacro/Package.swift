// swift-tools-version: 5.9
// The swift-tools-version declares the minimum version of Swift required to build this package.

import PackageDescription
import CompilerPluginSupport

let package = Package(
    name: "MyMacro",
    platforms: [.macOS(.v13), .iOS(.v17)],
    products: [
        .library(name: "MyMacro", targets: ["MyMacro"]),
        .executable(name: "MyMacroClient", targets: ["MyMacroClient"]),
    ],
    dependencies: [
        .package(url: "https://github.com/swiftlang/swift-syntax.git", from: "510.0.0"),
    ],
    targets: [
        .macro(
            name: "MyMacroMacros",
            dependencies: [
                .product(name: "SwiftSyntaxMacros", package: "swift-syntax"),
                .product(name: "SwiftCompilerPlugin", package: "swift-syntax"),
            ]
        ),
        .target(
            name: "MyMacro",
            dependencies: ["MyMacroMacros"]
        ),
        .executableTarget(
            name: "MyMacroClient",
            dependencies: ["MyMacro"]
        ),
        .testTarget(
            name: "MyMacroTests",
            dependencies: [
                "MyMacroMacros",
                .product(name: "SwiftSyntaxMacrosTestSupport", package: "swift-syntax"),
            ]
        ),
    ]
)
