import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["src/index.ts"],
  format: "esm", // ESM only — matches "type": "module"
  dts: true, // generate .d.ts files alongside the JS
  clean: true, // wipe dist/ before each build
  exports: {
    devExports: "source",
  },
});