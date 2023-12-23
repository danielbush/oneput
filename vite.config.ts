import { defineConfig } from 'vite';

export default defineConfig({
  test: {
    environment: 'jsdom',
    coverage: {
      exclude: [
        'src/**/*.test.ts',
        '**/*.d.ts',
        'src/cli/**',
        'src/app/sketch.ts',
        'src/index.ts',
      ],
      include: ['src/**/*.ts'],
      thresholds: {
        statements: 81,
        branches: 65,
        functions: 90,
        lines: 82,
      },
    },
  },
} as Parameters<typeof defineConfig>[0]);
