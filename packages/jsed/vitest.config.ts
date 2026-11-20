import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'happy-dom',
    testTimeout: 1000,
    coverage: {
      exclude: ['src/**/*.test.ts', '**/*.d.ts', 'src/cli/**', 'src/app/sketch.ts', 'src/index.ts'],
      include: ['src/**/*.ts'],
      thresholds: {
        statements: 81,
        branches: 65,
        functions: 90,
        lines: 82
      }
    }
  }
});
