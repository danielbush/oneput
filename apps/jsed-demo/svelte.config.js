import adapter from '@sveltejs/adapter-auto';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  // Consult https://svelte.dev/docs/kit/integrations
  // for more information about preprocessors
  preprocess: vitePreprocess(),
  kit: {
    // adapter-auto only supports some environments, see https://svelte.dev/docs/kit/adapter-auto for a list.
    // If your environment is not supported, or you settled on a specific environment, switch out the adapter.
    // See https://svelte.dev/docs/kit/adapters for more information about adapters.
    adapter: adapter(),
    alias: {
      // These aliases help with developing alongside a local version on oneput.
      // Oneput's "exports" directive in its package.json specifies "." for
      // $oneput and "./shared/*" for $shared.
      $oneput: '../../packages/oneput/src/lib/index.ts',
      $shared: '../../packages/oneput/src/lib/oneput/shared',
      $types: '../../packages/oneput/dist/index.d.ts'
    }
  }
};

export default config;
