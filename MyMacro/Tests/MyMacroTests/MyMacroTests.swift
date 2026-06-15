import SwiftSyntaxMacros
import SwiftSyntaxMacrosTestSupport
import XCTest

// Macro implementations are built as part of the compiler plugin;
// import the module that contains the implementation.
@testable import MyMacroMacros

let testMacros: [String: Macro.Type] = [
    "stringify": StringifyMacro.self,
]

final class MyMacroTests: XCTestCase {
    func testStringify() throws {
        assertMacroExpansion(
            """
            #stringify(a + b)
            """,
            expandedSource: """
            (a + b, "a + b")
            """,
            macros: testMacros
        )
    }

    func testStringifyWithLiteral() throws {
        assertMacroExpansion(
            """
            #stringify(1 + 1)
            """,
            expandedSource: """
            (1 + 1, "1 + 1")
            """,
            macros: testMacros
        )
    }
}
