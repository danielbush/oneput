/// <reference types="vitest/config" />
import devtoolsJson from 'vite-plugin-devtools-json';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
// import mkcert from 'vite-plugin-mkcert';

// mkcert generates self-signed cert so we can run dev with https.  To revert to
// http, remove the mkcert plugin and the server.https setting.

export default defineConfig({
  plugins: [
    sveltekit(),
    devtoolsJson()
    //// @ts-expect-error mkcert is missing types or its types are wrong, ignore this error
    // mkcert()
  ],
  server: {
    // https: true
  },
  test: {
    expect: { requireAssertions: true },
    projects: [
      {
        extends: './vite.config.ts',
        test: {
          name: 'client',
          environment: 'browser',
          browser: {
            enabled: true,
            provider: 'playwright',
            instances: [{ browser: 'chromium' }]
          },
          include: ['src/**/*.svelte.{test,spec}.{js,ts}'],
          exclude: ['src/lib/server/**'],
          setupFiles: ['./vitest-setup-client.ts']
        }
      },
      {
        extends: './vite.config.ts',
        test: {
          name: 'server',
          environment: 'node',
          include: ['src/**/*.{test,spec}.{js,ts}'],
          exclude: ['src/**/*.svelte.{test,spec}.{js,ts}']
        }
      }
    ]
  }
});
