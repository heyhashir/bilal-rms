import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    // Generated web, desktop-package, local-storage, and test-report files are
    // runtime artifacts rather than source code. Scanning Electron's unpacked
    // runtime made the production lint command unnecessarily slow.
    ignores: [
      "dist/**",
      "backend/dist/**",
      "backend/public/**",
      "desktop/dist/**",
      "desktop/dist-*/**",
      "storage/**",
      "test-results/**",
      "playwright-report/**",
      ".output/**",
      ".vinxi/**",
    ],
  },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      // TanStack Router route modules intentionally export route metadata and components.
      "react-refresh/only-export-components": "off",
      "@typescript-eslint/no-unused-vars": "off",
    },
  },
);
