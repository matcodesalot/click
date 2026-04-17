import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["src/index.ts"],
  format: "esm",
  target: "node22",
  platform: "node",
  clean: true,
  dts: false,
  deps: {
    neverBundle: ["mongoose", "express", "better-auth"],
  },
});