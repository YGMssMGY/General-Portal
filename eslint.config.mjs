import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";
import reactPlugin from "eslint-plugin-react";

const eslintConfig = [
    ...nextCoreWebVitals,
    ...nextTypescript,
    {
        ...reactPlugin.configs.flat.recommended,
        settings: { react: { version: "detect" } },
    },
    {
        rules: {
            "react/react-in-jsx-scope": "off",
            "react/prop-types": "off",
            "no-eval": "error",
            "no-implied-eval": "error",
            "no-new-func": "error",
            "no-restricted-syntax": [
                "error",
                {
                    selector: "JSXAttribute[name.name='dangerouslySetInnerHTML']",
                    message:
                        "dangerouslySetInnerHTML is forbidden. Render plain text via JSX escaping.",
                },
                {
                    selector: "CallExpression[callee.name='eval']",
                    message: "eval() is forbidden.",
                },
            ],
            "no-restricted-properties": [
                "error",
                {
                    object: "process",
                    property: "env",
                    message: "Use the typed config accessor from @/config instead of process.env.",
                },
            ],
        },
    },
    {
        files: [
            "src/config/**/*.ts",
            "src/db/**/*.ts",
            "src/lib/logger.ts",
            "src/tui/**/*",
            "src/ops/**/*",
            "scripts/**/*",
            "instrumentation.ts",
            "playwright.config.ts",
            "tests/e2e/**/*",
        ],
        rules: {
            "no-restricted-properties": "off",
        },
    },
    {
        ignores: [
            "node_modules/**",
            ".next/**",
            "out/**",
            "build/**",
            "next-env.d.ts",
            "src/db/migrations/**",
        ],
    },
];

export default eslintConfig;
