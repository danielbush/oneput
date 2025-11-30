<script lang="ts">
	import * as icons from '../icons.js';
	import type { Controller } from '../../controller.js';
	const { controller, onClick }: { controller: Controller; onClick: (evt: Event) => void } =
		$props();
</script>

<button
	title="Cancel"
	type="button"
	onclick={onClick}
	class={['oneput__icon-button', controller.input.getInputValue() || 'highlight']}
>
	<!-- eslint-disable svelte/no-at-html-tags -->
	{@html icons.xIcon}
	<!-- eslint-enable svelte/no-at-html-tags -->
</button>

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
