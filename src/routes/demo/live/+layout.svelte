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

<div class="app-container">
	<div class="content-area">
		{@render children()}
	</div>

	<div class="command-bar">
		<OneputController controllerRef={setController} />
	</div>
</div>

<style>
	:global {
		body {
			margin: 0;
		}
	}

	.app-container {
		display: flex;
		flex-direction: column;
		height: 100vh;
		width: 100vw;
		overflow: hidden;
	}

	.content-area {
		flex: 1;
		overflow-y: auto;
		padding: 1rem;
	}

	.command-bar {
		position: fixed;
		bottom: 0;
		width: 100%;
		padding-bottom: 8px;
		display: flex;
		justify-content: center;
	}
</style>
