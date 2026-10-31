# Solidity Style Guide Summary

This document summarizes key rules and best practices for Solidity development, based on the official Solidity Style Guide and industry standards from OpenZeppelin and ConsenSys.

## 1. Source File Organization
- **License Identifier**: Every source file should start with a machine-readable SPDX license identifier (e.g., `// SPDX-License-Identifier: MIT`).
- **Pragma**: Use a specific compiler version (e.g., `pragma solidity 0.8.20;`) rather than a floating pragma (`^0.8.20`) for deployed contracts to ensure deterministic builds.
- **Layout Order**:
  1. License Identifier
  2. Pragma statements
  3. Import statements
  4. Interfaces
  5. Libraries
  6. Contracts

## 2. Contract Layout
Inside each contract, library, or interface, use the following order:
1. Type declarations (enums, structs)
2. State variables
3. Events
4. Modifiers
5. Functions

**Function Order**:
- Constructor
- Receive function (if exists)
- Fallback function (if exists)
- External
- Public
- Internal
- Private

## 3. Naming Conventions
- **Contracts & Libraries**: `UpperCamelCase` (e.g., `SimpleToken`).
- **Structs & Enums**: `UpperCamelCase` (e.g., `UserAccount`).
- **Events**: `UpperCamelCase` (e.g., `Transfer`).
- **Functions**: `lowerCamelCase` (e.g., `getBalance`).
- **Function Arguments**: `lowerCamelCase` (e.g., `_address`).
- **Local & State Variables**: `lowerCamelCase` (e.g., `accountBalance`).
- **Constants**: `UPPER_CASE_WITH_UNDERSCORES` (e.g., `MAX_SUPPLY`).
- **Modifiers**: `lowerCamelCase` (e.g., `onlyOwner`).
- **Private/Internal**: It is common practice to prefix internal or private state variables and functions with an underscore (e.g., `_balances`).

## 4. Security Best Practices
- **Checks-Effects-Interactions**: Always follow this pattern to prevent reentrancy attacks.
  1. **Checks**: Validate inputs and conditions (e.g., `require`).
  2. **Effects**: Update the contract state (e.g., update balances).
  3. **Interactions**: Interact with other contracts (e.g., `transfer` or external calls).
- **Visibility**: Always explicitly define visibility for all functions (`external`, `public`, `internal`, or `private`).
- **Error Handling**: Use `revert CustomError()` (Solidity 0.8.4+) for gas efficiency instead of string-based `require`.
- **Overflow/Underflow**: Use Solidity 0.8.0+ which has built-in overflow checks, or `SafeMath` for older versions.

## 5. Documentation (NatSpec)
Use Ethereum Natural Language Specification (NatSpec) for all public and external interfaces:
- `/// @notice`: Explain to an end user what this does.
- `/// @dev`: Explain to a developer any extra details.
- `/// @param`: Document a parameter.
- `/// @return`: Document a return value.

*Source: [Solidity Documentation - Style Guide](https://docs.soliditylang.org/en/latest/style-guide.html)*
