import tseslint from "@typescript-eslint/eslint-plugin";
import parser from "@typescript-eslint/parser";
import nextPlugin from "@next/eslint-plugin-next";
// eslint-config-next might provide configurations directly if it supports flat config
// For now, let's assume we configure rules manually or the plugin provides them.

export default [
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "dist/**",
      "build/**",
      "eslint.config.mjs",
      "next.config.js",
      "prisma.config.js",
      "next-eslint.d.ts",
    ],
  },
  {
    files: ["**/*.{ts,tsx,js,jsx}"],
    languageOptions: {
      parser,
      sourceType: "module",
      parserOptions: {
        project: "./tsconfig.json",
        tsconfigRootDir: process.cwd(),
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        React: "readonly",
        JSX: "readonly",
        NodeJS: "readonly",
      },
    },
    plugins: {
      "@typescript-eslint": tseslint,
      "@next/next": nextPlugin,
    },
    rules: {
      // Apply recommended TypeScript rules
      ...(tseslint.configs.recommended?.rules || {}),
      // Apply recommended-type-checking TypeScript rules if you have project set in parserOptions
      ...(tseslint.configs["recommended-type-checking"]?.rules || {}),

      // Your custom rules/overrides
      "@typescript-eslint/no-unused-vars": "warn",
      "@typescript-eslint/explicit-module-boundary-types": "off",
      "no-console": "warn",

      // Individual Next.js rules can be enabled here if needed, e.g.:
      // '@next/next/no-html-link-for-pages': 'error',
      // '@next/next/no-img-element': 'warn',
    },
    settings: {
      react: {
        version: "detect", // Automatically detect the React version
      },
    },
  },
];
