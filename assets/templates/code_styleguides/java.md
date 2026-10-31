# Google Java Style Guide Summary

This document summarizes key rules and best practices from the Google Java Style Guide.

## 1. Source File Organization
- **Filename**: The source file name is the case-sensitive name of the top-level class it contains, plus the `.java` extension.
- **File Encoding**: UTF-8.
- **Structure**:
  1. License or copyright information (if any)
  2. Package statement
  3. Import statements
  4. Exactly one top-level class

## 2. Formatting
- **Indentation**: 2 spaces (Google style).
- **Column limit**: 100 characters.
- **Braces**: Use Egyptian brackets (opening brace on the same line).
- **Empty blocks**: Can be concise `{}` if they contain no code.

## 3. Naming Conventions
- **Packages**: `lower.case.with.dots` (e.g., `com.google.common.base`).
- **Classes**: `UpperCamelCase` (e.g., `HttpRequest`).
- **Methods**: `lowerCamelCase` (e.g., `sendMessage`).
- **Variables**: `lowerCamelCase` (e.g., `userId`).
- **Constants**: `CONSTANT_CASE` (e.g., `MAX_RETRY_COUNT`).
- **Type Variables**: Single capital letter or `UpperCamelCase` followed by a capital letter (e.g., `T`, `RequestT`).

## 4. Programming Practices
- **Overrides**: Always use the `@Override` annotation.
- **Exceptions**: Never ignore exceptions. At least log them or explain why they are ignored in a comment.
- **Static Members**: Access static members via the class name, not an instance (e.g., `MyClass.staticMethod()`).
- **Finalizers**: Do not use `Object.finalize()`.

## 5. Javadoc
- **Formatting**: Use standard Javadoc format `/** ... */`.
- **At-clauses**: Use `@param`, `@return`, `@throws`, `@deprecated` in that order.
- **Summary**: The first sentence of each Javadoc block should be a concise summary.

*Source: [Google Java Style Guide](https://google.github.io/styleguide/javaguide.html)*
