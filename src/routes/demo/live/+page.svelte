<script lang="ts">
	import { start } from '../../../lib/jsed/index.js';
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

<div>Test sentence.</div>
