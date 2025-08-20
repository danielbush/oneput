<script lang="ts">
	import Oneput from './Oneput.svelte';
	import type { OneputControllerParams, OneputProps } from './lib.js';

	const currentProps = $state<OneputProps>({
		inputValue: '',
		placeholder: 'Type here...',
		handleInputChange: () => {},
		menu: { items: [] }
	});

	export const controller = {
		update(options: OneputControllerParams) {
			if (options.input) {
				currentProps.input = options.input;
			}
		}
	};

	const { controllerRef }: { controllerRef: (c: typeof controller) => void } = $props();

	$effect(() => {
		if (controllerRef) {
			controllerRef(controller);
		}
	});
</script>

<div>
	<Oneput {...currentProps} />
</div>
