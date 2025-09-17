<script lang="ts">
	import type { Controller } from '$lib/oneput/controller.js';
	import { Folder, FolderOpen } from '@lucide/svelte';

	const { controller }: { controller: Controller } = $props();
</script>

{#if controller.menu.menuOpen}
	<div><FolderOpen /></div>
{:else}
	<div><Folder /></div>
{/if}

<style>
	div {
		display: flex;
		max-width: var(--oneput-icon-width-small);
		min-width: var(--oneput-icon-width-small);
	}
</style>
