<script lang="ts">
	// Wraps Oneput and creates and exposes a controller that lets you
	// programmatically control Oneput.
	import Oneput from './Oneput.svelte';
	import { Controller } from '../controllers/controller.js';
	import { onMount } from 'svelte';
	import type { OneputProps } from '../types.js';

	let inputElement: HTMLInputElement | undefined = $state(undefined);
	const currentProps = $state<OneputProps>({
		menuItemFocus: [0, true],
		inputValue: '',
		placeholder: 'Type here...',
		onInputChange: () => {},
		menuItems: [],
		menuOpen: false
	});
	const { controllerRef }: { controllerRef: (c: Controller) => void } = $props();

	const controller = Controller.create(currentProps);

	$effect(() => {
		controller.input.handleInputElementChange(inputElement);
	});

	onMount(() => {
		controllerRef(controller);
	});
</script>

<Oneput
	{...currentProps}
	bind:inputValue={currentProps.inputValue}
	bind:inputElement
	bind:menuItemFocus={currentProps.menuItemFocus}
/>
