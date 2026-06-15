/// `#stringify(expression)` returns a `(T, String)` tuple.
/// The first element is the evaluated value; the second is its source text.
@freestanding(expression)
public macro stringify<T>(_ value: T) -> (T, String) = #externalMacro(module: "MyMacroMacros", type: "StringifyMacro")
