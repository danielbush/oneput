<script lang="ts">
	import Oneput from './Oneput.svelte';
	import type { OneputControllerProps } from './lib.js';
	import { Controller } from './controller.js';

	const currentProps = $state<OneputControllerProps>({
		menuItemFocus: 0,
		inputValue: '',
		placeholder: 'Type here...',
		handleInputChange: () => {},
		menu: { items: [] },
		menuOpen: false
	});
	const { controllerRef }: { controllerRef: (c: Controller) => void } = $props();
	const controller = new Controller(currentProps);
	let inputElement: HTMLInputElement | undefined = $state(undefined);
	$effect(() => {
		controller.setInputElement(inputElement);
	});

	$effect(() => {
		if (controllerRef) {
			controllerRef(controller);
		}
	});
</script>

<div>
	<Oneput
		{...currentProps}
		{controller}
		bind:inputElement
		bind:menuItemFocus={currentProps.menuItemFocus}
	/>
</div>
