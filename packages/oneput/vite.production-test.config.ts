import { svelte } from '@sveltejs/vite-plugin-svelte';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [svelte({ configFile: false, compilerOptions: { dev: false } })],
  resolve: { conditions: ['browser'] },
  build: {
    outDir: '.test-results/safe-html-production',
    lib: {
      entry: 'tests/production/entry.ts',
      formats: ['es'],
      fileName: () => 'entry.js'
    }
  }
});
