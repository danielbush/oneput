<script lang="ts">
	import * as icons from '../icons.js';
	import type { Controller } from '../../controller.js';
	const { controller, onClick }: { controller: Controller; onClick: (evt: Event) => void } =
		$props();
</script>

{#if controller.input.getInputValue()}
	<button title="Accept" type="button" onclick={onClick} class="oneput__icon-button enabled">
		<!-- eslint-disable svelte/no-at-html-tags -->
		{@html icons.tickIcon}
		<!-- eslint-enable svelte/no-at-html-tags -->
	</button>
{/if}

<style>
	.enabled {
		background-color: rgb(0 128 0 / 0.8);
		color: white;
	}
	.enabled:hover {
		background-color: rgb(0 128 0 / 1);
	}
</style>
