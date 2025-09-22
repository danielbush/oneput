<script lang="ts">
	import { start } from '../lib/jsed/index.js';
	import { onMount } from 'svelte';

	let root: HTMLElement | null = null;

	onMount(() => {
		if (!root) return;
		const doc = start(root);
		console.log('Access "doc" in the console');
		// TODO: improve ts
		(globalThis as any).doc = doc;
		console.log(doc);
	});
</script>

<div bind:this={root}>
	<h1>Welcome to your library project</h1>
	<p>Create your package using @sveltejs/package and preview/showcase your work with SvelteKit</p>
	<p>
		Visit <a href="https://svelte.dev/docs/kit">svelte.dev/docs/kit</a> to read the documentation
	</p>
</div>
