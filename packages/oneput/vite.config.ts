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
        // Svelte's browser build, so that tests can mount components in happy-dom.
        resolve: { conditions: ['browser'] },
        test: {
          name: 'server',
          environment: 'happy-dom',
          include: ['src/**/*.{test,spec}.{js,ts}']
        }
      }
    ]
  }
});
