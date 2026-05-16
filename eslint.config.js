import js from "@eslint/js";
import ts from "typescript-eslint";
import importPlugin from "eslint-plugin-import";
import globals from "globals";

export default [
  js.configs.recommended,
  ...ts.configs.recommended,
  importPlugin.flatConfigs.recommended,
  {
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        ...globals.node,
        ...globals.es2021,
      },
      parserOptions: {
        project: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    settings: {
      "import/parsers": {
        "@typescript-eslint/parser": [".ts", ".tsx"],
      },
      "import/resolver": {
        typescript: {
          alwaysTryTypes: true,
          project: "./tsconfig.json",
        },
        node: true,
      },
    },
    rules: {
      "import/no-unresolved": "error",
      "import/no-extraneous-dependencies": [
        "error",
        {
          devDependencies: [
            "**/*.test.ts",
            "**/*.spec.ts",
            "**/test/**",
            "**/scripts/**",
          ],
          optionalDependencies: false,
          peerDependencies: true,
        },
      ],
    },
  },
  {
    files: ["**/*.test.ts", "**/*.spec.ts"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-expressions": "off",
    },
    languageOptions: {
      globals: {
        ...globals.jest,
        ...globals.mocha,
      },
    },
  },
  {
    ignores: [
      "**/node_modules/",
      "**/dist/",
      "**/build/",
      "**/.next/",
      "**/coverage/",
      "**/*.min.js",
      "**/eslint.config.js",
    ],
  },
];