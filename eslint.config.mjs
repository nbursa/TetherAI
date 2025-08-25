import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import prettier from "eslint-plugin-prettier";
import globals from "globals";

export default [
    {
        ignores: [
            "**/node_modules/**",
            "**/dist/**",
            "**/.next/**",
            "examples/*/node_modules/**",
            "examples/*/.next/**",
            "eslint.config.mjs",
        ],
    },
    eslint.configs.recommended,
    {
        files: ["**/*.mjs", "**/*.cjs", "**/scripts/*.mjs", "**/scripts/*.cjs"],
        languageOptions: {
            sourceType: "module",
            parserOptions: { ecmaVersion: "latest" },
            globals: {
                ...globals.node,
            },
        },
        rules: {
            "no-console": "off",
        },
    },
    ...tseslint.configs.recommendedTypeChecked.map((cfg) => ({
        ...cfg,
        files: ["**/*.ts", "**/*.tsx"],
    })),
    {
        files: ["**/*.ts", "**/*.tsx"],
        languageOptions: {
            parserOptions: {
                project: [
                    "./tsconfig.base.json",
                    "./packages/core/tsconfig.json",
                    "./packages/provider/openai/tsconfig.json",
                    "./packages/provider/anthropic/tsconfig.json",
                    "./examples/nextjs/tsconfig.json",
                ],
                tsconfigRootDir: new URL(".", import.meta.url).pathname,
            },
        },
        plugins: { prettier },
        rules: {
            "prettier/prettier": ["error", { endOfLine: "auto" }],
            "@typescript-eslint/no-explicit-any": "error",
        },
    },
];