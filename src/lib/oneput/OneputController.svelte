<script lang="ts">
	import Oneput from './Oneput.svelte';
	import type { OneputProps } from './lib.js';
	import { Controller } from './controller.js';

	const currentProps = $state<OneputProps>({
		menuItemFocus: 0,
		inputValue: '',
		placeholder: 'Type here...',
		handleInputChange: () => {},
		menu: { items: [] },
		menuOpen: false
	});
	const { controllerRef }: { controllerRef: (c: Controller) => void } = $props();
	const controller = new Controller(currentProps);

	$effect(() => {
		if (controllerRef) {
			controllerRef(controller);
		}
	});
</script>

<div>
	<Oneput {...currentProps} bind:menuItemFocus={currentProps.menuItemFocus} />
</div>
