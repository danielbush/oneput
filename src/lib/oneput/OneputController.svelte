<script lang="ts">
	// Wraps Oneput and creates and exposes a controller that lets you
	// programmatically control Oneput.
	import Oneput from './Oneput.svelte';
	import type { OneputControllerProps } from './lib.js';
	import { Controller } from './controller.js';
	import { onMount } from 'svelte';

	let inputElement: HTMLInputElement | undefined = $state(undefined);
	const currentProps = $state<OneputControllerProps>({
		menuItemFocus: 0,
		inputValue: '',
		placeholder: 'Type here...',
		onInputChange: () => {},
		menu: { items: [] },
		menuOpen: false
	});
	const { controllerRef }: { controllerRef: (c: Controller) => void } = $props();

	const controller = new Controller(currentProps);

	$effect(() => {
		controller.setInputElement(inputElement);
	});

	onMount(() => {
		controllerRef(controller);
	});
</script>

<Oneput
	{...currentProps}
	{controller}
	bind:inputValue={currentProps.inputValue}
	bind:inputElement
	bind:menuItemFocus={currentProps.menuItemFocus}
	bind:menuItemFocusOrigin={currentProps.menuItemFocusOrigin}
/>
