<script lang="ts">
	import type { Controller } from '../../controllers/controller.js';

	const { controller }: { controller: Controller } = $props();
	let label = $derived.by(() => {
		return `${controller.menu.currentMenu.displayedMenuItemCount} ${controller.menu.currentMenu.displayedMenuItemCount === 1 ? 'item' : 'items'}`;
	});
</script>

{#if controller.menu.isMenuOpen}
	<div class="open">
		{label}
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
