# Rust Style Guide Summary

This document summarizes key rules and best practices for Rust development, based on the official Rust style guidelines and common idiomatic patterns.

## 1. Naming Conventions
- **`UpperCamelCase`**: Types (structs, enums, traits), type aliases, and enum variants.
- **`snake_case`**: Crates, modules, functions, methods, variables, and arguments.
- **`SCREAMING_SNAKE_CASE`**: Statics and constants.
- **`T` (Single Letter)**: Type parameters (e.g., `<T>`, `<U>`).

## 2. Formatting (Rustfmt)
- Use 4-space indentation.
- Maximum line width: 100 characters.
- Use curly braces for all `if`, `else`, `while`, and `loop` blocks.
- Place the opening brace on the same line as the declaration.

## 3. Idiomatic Patterns
- **Pattern Matching**: Prefer `match` or `if let` over complex nested `if` statements.
- **Error Handling**: 
  - Use `Result<T, E>` for recoverable errors and `Option<T>` for optional values.
  - Use the `?` operator for concise error propagation.
  - Avoid `unwrap()` and `expect()` in production code unless a panic is truly intended.
- **Ownership and Borrowing**:
  - Prefer immutable borrows (`&T`) by default.
  - Use mutable borrows (`&mut T`) only when necessary.
  - Avoid unnecessary cloning; prefer passing references.
- **Iterators**: Use iterator methods (`map`, `filter`, `fold`, etc.) instead of manual loops where it improves clarity.

## 4. Documentation
- Use `///` for documentation comments on items (functions, structs, etc.).
- Use `//!` for module-level or crate-level documentation.
- Documentation should include an "Examples" section using markdown code blocks.
- Markdown is supported and encouraged in doc comments.

## 5. Attributes and Macros
- Use `#[derive(...)]` for common traits like `Debug`, `Clone`, `PartialEq`, and `Serialize`.
- Keep macros simple and well-documented. Avoid complex macro logic where regular functions suffice.

## 6. Dependencies (Cargo.toml)
- Be explicit with versioning.
- Periodically run `cargo update` and `cargo audit` to manage security vulnerabilities.
- Prefer small, focused crates over large "kitchen sink" dependencies.

*Source: [Official Rust Style Guidelines](https://github.com/rust-lang/rust/tree/master/src/doc/style-guide)*
