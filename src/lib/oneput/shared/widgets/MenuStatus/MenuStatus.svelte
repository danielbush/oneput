<script lang="ts">
	import type { Controller } from '$lib/oneput/controller.js';

	const { controller }: { controller: Controller } = $props();
</script>

{#if controller.menu.isMenuOpen}
	<div class="open">
		{controller.menu.menuItemCount}
		{controller.menu.menuItemCount === 1 ? 'item' : 'items'}
	</div>
{:else}
	<div class="closed">--</div>
{/if}

<style>
	div.closed {
		max-width: var(--oneput-icon-width-small);
		min-width: var(--oneput-icon-width-small);
	}
	div {
		display: flex;
	}
</style>
