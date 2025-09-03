<script lang="ts">
	// Wraps Oneput and creates and exposes a controller that lets you
	// programmatically control Oneput.
	import Oneput from './Oneput.svelte';
	import type { OneputControllerProps } from './lib.js';
	import { Controller } from './controller.js';

	let inputElement: HTMLInputElement | undefined = $state(undefined);
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

	$effect(() => {
		controller.setInputElement(inputElement);
	});

	$effect(() => {
		if (controllerRef) {
			controllerRef(controller);
		}
	});
</script>

{#snippet oneput()}
	<Oneput
		{...currentProps}
		{controller}
		bind:inputValue={currentProps.inputValue}
		bind:inputElement
		bind:menuItemFocus={currentProps.menuItemFocus}
		bind:menuItemFocusOrigin={currentProps.menuItemFocusOrigin}
	/>
{/snippet}

{@render oneput()}
