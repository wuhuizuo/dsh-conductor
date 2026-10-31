# Swift Style Guide Summary

This document summarizes key rules and best practices for Swift development, based on the official Swift API Design Guidelines and common community standards.

## 1. Naming Conventions
- **Types (Structs, Classes, Enums, Protocols)**: `UpperCamelCase`.
- **Functions, Variables, Arguments**: `lowerCamelCase`.
- **Enum Variants**: `lowerCamelCase`.
- **Clarity over Brevity**: Prefer descriptive names over short ones (e.g., `remove(at:)` instead of `delete()`).

## 2. Formatting
- **Indentation**: 4 spaces (standard for Xcode/Swift).
- **Line Width**: Limit to 100-120 characters.
- **Braces**: Opening brace on the same line as the declaration.

## 3. Optionals and Control Flow
- **Optional Binding**: Prefer `if let` or `guard let` over `!` (force unwrap).
- **Early Exit**: Use `guard` statements to keep the main logic at the lowest indentation level.
- **Switch Statements**: Always include a `default` case unless all cases are exhaustively covered.

## 4. Idiomatic Swift
- **Type Inference**: Rely on Swift's type inference for local variables.
- **Structs vs Classes**: Prefer `struct` by default. Use `class` only when you need reference semantics or inheritance.
- **Extensions**: Use `extension` to group related functionality or implement protocols.
- **Trailing Closures**: Use trailing closure syntax when a function's last argument is a closure.

## 5. Error Handling
- Use `Error` protocol and `throw` for recoverable errors.
- Use `Result` type for asynchronous error handling.
- Avoid `try!` unless failure is genuinely impossible.

## 6. Access Control
- Use `private` or `fileprivate` by default for implementation details.
- Be explicit about `public` or `internal` (though `internal` is the default).

*Source: [Swift.org API Design Guidelines](https://www.swift.org/documentation/api-design-guidelines/)*
