import { defineWorkspace } from "vitest/config";

export default defineWorkspace([
  {
    extends: "./vitest.config.ts",
    test: {
      name: "unit",
      include: ["apps/**/*.spec.ts", "libs/**/*.spec.ts"],
      exclude: ["**/*.integration.spec.ts", "**/node_modules/**", "dist/", "tmp/"],
    },
  },
  {
    extends: "./vitest.config.ts",
    test: {
      name: "integration",
      include: ["apps/**/*.integration.spec.ts", "libs/**/*.integration.spec.ts"],
      exclude: ["**/node_modules/**", "dist/", "tmp/"],
      testTimeout: 45000,
    },
  },
]);
