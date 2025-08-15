import js from "@eslint/js";
import globals from "globals";
import pluginPrettier from "eslint-plugin-prettier";
import tsPlugin from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import { defineConfig } from "eslint/config";

export default defineConfig({
  files: ["**/*.{js,cjs,mjs,ts,tsx}"],
  languageOptions: {
    parser: tsParser,
    parserOptions: {
      ecmaVersion: 2021,
      sourceType: "module"
    },
    globals: globals.node
  },
  plugins: {
    prettier: pluginPrettier,
    "@typescript-eslint": tsPlugin
  },
  rules: {
    ...js.configs.recommended.rules,
    ...tsPlugin.configs.recommended.rules,
    "prettier/prettier": "error",
    "@typescript-eslint/no-unused-vars": "warn"
  }
});