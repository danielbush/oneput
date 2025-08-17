import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

export default {
	// Consult https://svelte.dev/docs#compile-time-svelte-preprocess
	// for more information about preprocessors
	preprocess: vitePreprocess(),
	// Not sure this does anything, the real config is in vite.config.js.  But this will avoid a warning when configuring the component with: <svelte:options customElement={{ tag: 'oneput-wc' }} />.
	compilerOptions: {
		customElement: true
	}
};
