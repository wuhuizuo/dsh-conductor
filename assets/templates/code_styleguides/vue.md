# Vue.js Style Guide Summary

This document summarizes key rules and best practices from the official Vue.js Style Guide, specifically for Vue 3 and the Composition API.

## 1. Component Files
- **Single File Components (SFC)**: Always use `.vue` files.
- **Naming**: Use `PascalCase` for component filenames (e.g., `TodoList.vue`).
- **Structure**: Follow the standard order: `<script setup>`, `<template>`, `<style>`.

## 2. Component Data
- **Composition API**: Prefer `<script setup>` and the Composition API over the Options API.
- **Ref vs Reactive**: Use `ref()` for primitive values and `reactive()` for objects/arrays (or `ref()` consistently for both).
- **Props**: 
  - Use `defineProps` with TypeScript types.
  - Props should be used for data passing only (unidirectional flow).

## 3. Template Syntax
- **Directives**: Use shorthand for `v-bind` (`:`) and `v-on` (`@`).
- **Key Attribute**: Always use `:key` with `v-for`. Never use an index as a key if the list can change.
- **Computed Properties**: Use `computed()` for complex logic in templates. Never use method calls for data derived from other reactive state in templates.

## 4. Lifecycle Hooks
- Use Composition API lifecycle hooks (e.g., `onMounted`, `onUnmounted`) within `setup`.
- Ensure listeners and timers are cleaned up in `onUnmounted`.

## 5. Global State
- **Pinia**: Use Pinia for complex global state management.
- **Provide/Inject**: Use `provide`/`inject` for dependency injection across deeply nested components.

## 6. Styling
- **Scoped Styles**: Use `<style scoped>` by default to prevent leaking styles.
- **CSS Variables**: Use reactive CSS variables via `v-bind()` in `<style>` blocks where appropriate.

## 7. Directives & Events
- **Custom Directives**: Use sparingly. Prefer components for reusable logic.
- **Emit**: Use `defineEmits` for documenting and typed-checking events.

*Source: [Official Vue.js Style Guide](https://vuejs.org/style-guide/)*
