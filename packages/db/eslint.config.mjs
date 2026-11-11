import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["node_modules/**", "dist/**", "coverage/**", "src/database.types.ts"] },
  js.configs.recommended,
  ...tseslint.configs.strict,
);
