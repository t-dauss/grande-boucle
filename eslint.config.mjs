import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default [
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    ignores: [".next/**", "node_modules/**"],
  },
  {
    files: ["tailwind.config.js", "postcss.config.js"],
    languageOptions: {
      globals: {
        module: "readonly",
      },
    },
  },
  {
    files: ["public/service-worker.js"],
    languageOptions: {
      globals: {
        self: "readonly",
        clients: "readonly",
      },
    },
  },
];
