<script lang="ts">
	import Oneput from './Oneput.svelte';
	import type { OneputProps } from './lib.js';
	import { Controller } from './Controller.js';

	const currentProps = $state<OneputProps>({
		inputValue: '',
		placeholder: 'Type here...',
		handleInputChange: () => {},
		menu: { items: [] },
		menuOpen: false
	});

	const controller = new Controller(currentProps);

	const { controllerRef }: { controllerRef: (c: Controller) => void } = $props();

	$effect(() => {
		if (controllerRef) {
			controllerRef(controller);
		}
	});
</script>

<div>
	<Oneput {...currentProps} />
</div>
