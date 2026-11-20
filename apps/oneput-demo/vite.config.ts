import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [sveltekit()],
  test: {
    expect: { requireAssertions: true },
    projects: [
      {
        extends: true,
        test: {
          name: 'server',
          testTimeout: 1000,
          environment: 'node',
          include: ['src/**/*.{test,spec}.{js,ts}']
        }
      }
    ]
  }
});
