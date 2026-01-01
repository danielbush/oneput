<script lang="ts">
	import { renderIcon } from '../../lib/icons.js';
	import type { Controller } from '../../controller.js';
	const { controller, onClick }: { controller: Controller; onClick: (evt: Event) => void } =
		$props();
	let iconNode: HTMLButtonElement | null = $state(null);
	$effect(() => {
		if (iconNode) {
			renderIcon('x', iconNode);
		}
	});
</script>

<button
	title="Cancel"
	aria-label="Cancel"
	type="button"
	onclick={onClick}
	class={['oneput__icon-button', controller.input.getInputValue() || 'highlight']}
	bind:this={iconNode}
></button>

<style>
	:not(.highlight) {
		color: rgb(128 0 0 / 0.8);
	}
	.highlight {
		background-color: rgb(128 0 0 / 0.8);
		color: white;
	}
	.highlight:hover {
		background-color: rgb(128 0 0 / 1);
	}
</style>
