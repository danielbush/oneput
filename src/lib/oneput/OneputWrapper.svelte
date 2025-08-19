<script lang="ts">
	import Oneput from './Oneput.svelte';
	import type { OneputController } from './lib.js';

	const controller: OneputController = {
		/** a test action provided by oneput */
		doSomething: () => {
			console.log('did something');
		}
	};

	let { controllerRef }: { controllerRef: (controller: OneputController) => void } = $props();

	$effect(() => {
		if (controllerRef) {
			controllerRef(controller);
		}
	});
</script>

<div>
	<Oneput inputValue="" menu={{ items: [] }} placeholder="wrapper" handleInputChange={() => {}} />
</div>
