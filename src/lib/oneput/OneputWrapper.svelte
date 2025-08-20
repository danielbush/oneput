<script lang="ts">
	import { tinykeys } from 'tinykeys';
	import Oneput from './Oneput.svelte';
	import type { Controller, OneputControllerParams, OneputProps } from './lib.js';

	const currentProps = $state<OneputProps>({
		inputValue: '',
		placeholder: 'Type here...',
		handleInputChange: () => {},
		menu: { items: [] },
		menuOpen: false
	});

	const handleGlobalKeys = (keys?: OneputControllerParams['globalKeys']) => {
		if (keys?.keys) {
			for (const [key, thunk] of Object.entries(keys.keys)) {
				console.log('setting up key', key, thunk);
				tinykeys(document.body, { [key]: thunk });
			}
		}
	};

	export const controller: Controller = {
		update(options: OneputControllerParams) {
			if (options.input) {
				currentProps.input = options.input;
			}
			handleGlobalKeys(options.globalKeys);
			if (options.menuOpen !== undefined) {
				currentProps.menuOpen = options.menuOpen;
			}
		},
		get menuOpen() {
			return currentProps.menuOpen ?? false;
		},
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
