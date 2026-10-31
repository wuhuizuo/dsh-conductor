# Ruby Style Guide Summary

This document summarizes key rules and best practices for Ruby development, largely based on the community-driven Ruby Style Guide and RuboCop defaults.

## 1. Source Code Layout
- **Indentation**: 2 spaces per indentation level.
- **Line Length**: Limit lines to 80 characters where possible.
- **Spaces**: Use spaces around operators, after commas, colons, and semicolons.
- **Newlines**: End each file with a single newline.

## 2. Naming Conventions
- **Classes and Modules**: `UpperCamelCase`.
- **Methods and Variables**: `snake_case`.
- **Constants**: `SCREAMING_SNAKE_CASE`.
- **Predicate Methods**: Methods returning booleans should end with a question mark (e.g., `is_empty?`).
- **Bang Methods**: Methods that modify the receiver or are "dangerous" should end with an exclamation mark (e.g., `save!`).

## 3. Syntax and Style
- **Quoting**: Prefer single quotes (`'`) for strings that don't require interpolation or special characters.
- **Interpolation**: Use `#{expression}` for string interpolation.
- **Arrays**: Prefer the literal syntax `[]`. Use `%w()` for arrays of words.
- **Hashes**: Use the Ruby 1.9+ syntax `key: value` for symbol keys.
- **Conditionals**: Avoid `then` in `if/unless` statements. Use `unless` instead of `if !condition`.
- **Method Definitions**: Use parentheses when a method has parameters. Omit them when it doesn't.

## 4. Collections
- **Iteration**: Prefer `each` over `for`.
- **Transformation**: Use `map`, `select`, `reduce` for collection operations.
- **Selection**: Use `find` or `detect` to find a single element.

## 5. Exceptions
- **Control Flow**: Avoid using exceptions for control flow.
- **Rescue**: Be specific about the exception classes you rescue. Never rescue `Exception` (rescue `StandardError` instead).

## 6. Documentation
- **Comments**: Use `#` for comments.
- **Yard**: Use YARD-style documentation tags for methods and classes.

*Source: [The Ruby Style Guide](https://rubystyle.guide/)*
