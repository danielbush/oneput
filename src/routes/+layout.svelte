<script lang="ts">
	import '../demo-styles.css';
	import { setupDemoState } from '$lib/demo-state.svelte.js';

	let { children } = $props();
	setupDemoState();
</script>

{@render children()}
