import path from "node:path";
import { fileURLToPath } from "node:url";

import js from "@eslint/js";
import tseslint from "typescript-eslint";
import reactPlugin from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import jsxA11y from "eslint-plugin-jsx-a11y";
import importPlugin from "eslint-plugin-import";
import prettier from "eslint-plugin-prettier";
import globals from "globals";

const tsconfigRoot = path.dirname(fileURLToPath(import.meta.url));

export default tseslint.config(
  {
    ignores: [
      "node_modules/**",
      "dist/**",
      "build/**",
      "coverage/**",
      ".turbo/**",
      "**/*.js",
      "**/*.cjs",
      "**/*.mjs",
      "tests/**/*.cjs", // E2E test configs
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  {
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: "module",
      parserOptions: {
        projectService: true,
        tsconfigRootDir: tsconfigRoot,
      },
      globals: {
        ...globals.node,
        ...globals.browser,
        ...globals.jest,
      },
    },
    plugins: {
      react: reactPlugin,
      "react-hooks": reactHooks,
      "jsx-a11y": jsxA11y,
      import: importPlugin,
      prettier,
    },
    rules: {
      "no-console": ["warn", { allow: ["warn", "error"] }],
      eqeqeq: ["error", "always"],
      curly: ["error", "all"],
      "prefer-const": "error",
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/consistent-type-imports": ["error", { prefer: "type-imports" }],
      "@typescript-eslint/no-floating-promises": "error",
      "react/react-in-jsx-scope": "off",
      "react/prop-types": "off",
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      "prettier/prettier": [
        "error",
        {
          printWidth: 100,
          semi: true,
          singleQuote: false,
          trailingComma: "all",
          bracketSpacing: true,
          arrowParens: "always",
        },
      ],
    },
  },
  {
    files: ["apps/frontend/**/*.{ts,tsx}"],
    languageOptions: {
      globals: { ...globals.browser },
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
  {
    files: ["apps/backend/**/*.ts"],
    languageOptions: {
      globals: { ...globals.node },
    },
    rules: {
      "react/*": "off",
      "jsx-a11y/*": "off",
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
  {
    files: ["packages/utils/src/logger.ts"],
    rules: {
      "no-console": "off",
    },
  },
  {
    files: [
      "**/__tests__/**/*.ts",
      "**/__tests__/**/*.tsx",
      "**/*.test.ts",
      "**/*.test.tsx",
      "**/*.spec.ts",
      "**/*.spec.tsx",
      "tests/**/*.ts",
      "tests/**/*.tsx",
    ],
    languageOptions: {
      parserOptions: {
        // Disable type-aware linting for test files
        project: false,
      },
    },
    rules: {
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-call": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
      "@typescript-eslint/no-unsafe-return": "off",
      "@typescript-eslint/no-unsafe-argument": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-redundant-type-constituents": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "@typescript-eslint/unbound-method": "off",
      // Disable type-checking rules that require project references
      "@typescript-eslint/no-floating-promises": "off",
      "@typescript-eslint/await-thenable": "off",
      "@typescript-eslint/no-misused-promises": "off",
      "@typescript-eslint/no-unnecessary-type-assertion": "off",
    },
  },
);
