# Kotlin Style Guide Summary

This document summarizes key rules and best practices for Kotlin development, based on the official Kotlin coding conventions and Google's Android Kotlin style guide.

## 1. Source File Organization
- **Encoding**: UTF-8.
- **Indentation**: 4 spaces.
- **Structure**:
  1. Package header
  2. Imports
  3. Top-level declarations (classes, functions, etc.)

## 2. Naming Conventions
- **Classes/Interfaces**: `UpperCamelCase`.
- **Functions/Properties**: `lowerCamelCase`.
- **Constants**: `SCREAMING_SNAKE_CASE` (only for `const val`).
- **Packages**: `lower.case.without.underscores`.

## 3. Formatting
- Use 100 character line limit.
- Prefer expression bodies for simple one-line functions (e.g., `fun foo() = bar()`).
- Omit the unit return type explicitly (e.g., `fun foo(): Unit` \u2192 `fun foo()`).

## 4. Idiomatic Kotlin
- **Immutability**: Prefer `val` over `var` whenever possible.
- **Null Safety**:
  - Use `?.` and `?:` (Elvis operator) instead of explicit null checks.
  - Avoid `!!` (non-null assertion) unless absolutely certain.
- **Data Classes**: Use `data class` for simple data-holding classes.
- **Scope Functions**: Use `let`, `run`, `apply`, `also`, and `with` where they improve readability.
- **String Templates**: Prefer `"$foo"` over concatenation.

## 5. Collections
- Prefer read-only collection interfaces (`List`, `Map`, `Set`) over mutable ones.
- Use collection transformation methods (`map`, `filter`, etc.) instead of manual loops.

## 6. Documentation (KDoc)
- Use `/** ... */` for documentation comments.
- Use `[` and `]` to reference symbols within doc comments.

*Source: [Official Kotlin Coding Conventions](https://kotlinlang.org/docs/coding-conventions.html)*
