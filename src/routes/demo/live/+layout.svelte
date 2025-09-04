<script lang="ts">
	import { setController } from '$lib/demo/live/app.js';
	import '$lib/demo/styles.css';
	import '$lib/oneput/oneput-defaults.css';
	import '$lib/oneput/oneput-user-defined.css';
	import OneputController from '$lib/oneput/OneputController.svelte';

	// Pretend the code here could be something outside of svelte.
	// We create a layout and we add OneputWrapper eg as a web component.
	// We then get the controller from OneputWrapper and bootstrap our
	// oneput-based world.
	let { children } = $props();
</script>

<svelte:head>
	<!-- IOS_CLICK_ZOOM -->
	<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
</svelte:head>

{@render children()}
<div class="command-bar">
	<OneputController controllerRef={setController} />
</div>

<style>
	:global {
		body {
			margin: 0;
		}
	}

	.command-bar {
		position: fixed;
		left: 0;
		bottom: 0;
		width: 100%;
		display: flex;
		justify-content: center;
	}
</style>
