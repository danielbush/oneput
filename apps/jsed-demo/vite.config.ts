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
          environment: 'happy-dom',
          include: ['src/**/*.{test,spec}.{js,ts}']
        }
      }
    ]
  }
});
