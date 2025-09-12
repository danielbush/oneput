<script lang="ts">
	import Anchor from '$lib/oneput/Anchor.svelte';
	import OneputController from '$lib/oneput/OneputController.svelte';
	import { setController } from '$lib/demo/live/app.js';
	import '$lib/demo/styles.css';
	import '$lib/oneput/oneput-defaults.css';
	import OneputCornerButton from '$lib/oneput/OneputCornerButton.svelte';

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
<OneputCornerButton />
