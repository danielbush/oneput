<script lang="ts">
	// Pretend the code here could be something outside of svelte.
	// We create a layout and we add OneputWrapper eg as a web component.
	// We then get the controller from OneputWrapper and bootstrap our
	// oneput-based world.

	import '$lib/demo/styles.css';
	import '$lib/oneput/oneput-defaults.css';
	import '$lib/oneput/oneput-user-defined.css';
	import OneputWrapper from '$lib/oneput/OneputWrapper.svelte';
	import type { Controller } from '$lib/oneput/lib.js';

	// Our app starts in this callback.  We get the controller and we can set
	// keys and configure oneput.
	const setController = (c: Controller) => {
		c.update({
			globalKeys: {
				keys: {
					'$mod+k': () => {
						console.log('menuOpen', !c.menuOpen);
						c.update({ menuOpen: !c.menuOpen });
					}
				}
			},
			// Setting input will show the input part of Oneput.
			input: {}
		});
	};

	let { children } = $props();
</script>

<div class="app-container">
	<div class="content-area">
		{@render children()}
	</div>

	<div class="command-bar">
		<OneputWrapper controllerRef={setController} />
	</div>
</div>

<style>
	:global {
		body {
			margin: 0;
		}
		.oneput__container {
			--oneput-max-width: 600px;
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
		position: sticky;
		bottom: 0;
		z-index: 1000;
		padding-bottom: 8px;
		display: flex;
		justify-content: center;
	}
</style>
