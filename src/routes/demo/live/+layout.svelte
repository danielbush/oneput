<script lang="ts">
	import Anchor from '$lib/oneput/components/Anchor.svelte';
	import OneputController from '$lib/oneput/components/OneputController.svelte';
	import { setController } from '$lib/demo/live/app/_app.js';
	import '$lib/demo/styles.css';
	import '$lib/oneput/shared/styles/oneput-defaults.css';
	import OneputCornerButton from '$lib/oneput/components/OneputCornerButton.svelte';
	import { commandIcon } from '$lib/oneput/shared/icons.js';

	// Pretend the code here could be something outside of svelte.
	// We create a layout and we add OneputWrapper eg as a web component.
	// We then get the controller from OneputWrapper and bootstrap our
	// oneput-based world.
	let { children } = $props();
</script>

{@render children()}
<Anchor>
	<OneputController controllerRef={setController} />
</Anchor>
<OneputCornerButton icon={commandIcon} />
