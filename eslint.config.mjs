import eslint from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["lib/**", "coverage/**", "node_modules/**"] },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["scripts/**/*.mjs", "*.mjs"],
    languageOptions: {
      globals: { process: "readonly", console: "readonly", Buffer: "readonly" },
    },
  },
);
