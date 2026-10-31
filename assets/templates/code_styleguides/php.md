# PHP Style Guide Summary (PSR-12)

This document summarizes key rules from the PSR-12 Extended Coding Style Guide, which is the current standard for the PHP community.

## 1. Files and Basic Standards
- **PHP Tag**: Use only `<?php` or `<?=`.
- **Encoding**: UTF-8 without BOM.
- **Side Effects**: A file should either declare symbols (classes, functions, constants, etc.) or cause side effects, but not both.
- **Indentation**: 4 spaces.

## 2. Naming Conventions
- **Classes**: `UpperCamelCase` (e.g., `UserMapper`).
- **Methods**: `lowerCamelCase` (e.g., `getUserData`).
- **Constants**: `CONSTANT_CASE` (e.g., `MAX_RETRIES`).
- **Properties**: `lowerCamelCase` (preferred) or `snake_case` (be consistent).

## 3. Structure and Layout
- **Namespaces**: One declaration per line.
- **Imports**: Use `use` for imports. Group imports by type (classes, functions, constants).
- **Visibility**: Always declare visibility (`public`, `protected`, `private`) for properties and methods.
- **Strict Types**: Use `declare(strict_types=1);` at the top of every file.

## 4. Control Structures
- **Braces**: Opening brace on the same line for control structures, but on a new line for classes and methods (PSR style).
- **Conditionals**: Always use curly braces, even for one-line blocks.
- **Spaces**: One space after the control structure keyword, no space after the opening parenthesis.

## 5. Functions and Methods
- **Type Hinting**: Always use type hints for parameters and return types.
- **Nullables**: Use `?Type` or `Type | null` for nullable types.
- **Return Type**: The colon and type should follow the closing parenthesis with a space.

## 6. Documentation (DocBlocks)
- Use standard PHPDoc `/** ... */` for documenting classes, methods, and properties.
- Include `@param` and `@return` tags with specific types.

*Source: [PHP-FIG PSR-12](https://www.php-fig.org/psr/psr-12/)*
