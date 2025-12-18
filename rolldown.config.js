import { defineConfig } from "rolldown";

export default defineConfig({
  experimental: {
    attachDebugInfo: "none",
  },
  input: "./src/index.ts",
  output: {
    file: "./dist/mora.full.js",
  },
});
