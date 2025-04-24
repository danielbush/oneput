import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

// https://vite.dev/config/
export default defineConfig({
	build: {
		lib: {
			name: 'svelteWebComponents',
			entry: 'src/main.js', // entry point in vite svelte app
			formats: ['iife'], // immediately invoked function
			fileName: 'oneput-wc' // will generate /dist/*.iife.js
		}
	},
	plugins: [
		svelte({
			compilerOptions: {
				customElement: true
			}
		})
	]
});
