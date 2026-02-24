/// <reference types="vitest/config" />
import { resolve } from "node:path";
import { defineConfig } from "vite";

export default defineConfig({
  // See https://vite.dev/guide/build#library-mode (build.lib)
  build: {
    sourcemap: true,
    lib: {
      // Could also be a dictionary or array of multiple entry points
      entry: resolve(__dirname, "src/index.ts"),
      name: "jsed",
      // the proper extensions will be added
      fileName: "index",
    },
    rollupOptions: {
      output: {
        dir: "dist",
      },
      // make sure to externalize deps that shouldn't be bundled
      // into your library
      // external: ['vue'],
      // output: {
      //   // Provide global variables to use in the UMD build
      //   // for externalized deps
      //   globals: {
      //     vue: 'Vue',
      //   },
      // },
    },
  },
  test: {
    environment: "jsdom",
    coverage: {
      exclude: [
        "src/**/*.test.ts",
        "**/*.d.ts",
        "src/cli/**",
        "src/app/sketch.ts",
        "src/index.ts",
      ],
      include: ["src/**/*.ts"],
      thresholds: {
        statements: 81,
        branches: 65,
        functions: 90,
        lines: 82,
      },
    },
  },
} as Parameters<typeof defineConfig>[0]);
