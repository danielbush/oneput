/// <reference types="vitest/config" />
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [sveltekit()],
  test: {
    expect: { requireAssertions: true },
    projects: [
      {
        extends: './vite.config.ts',
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
