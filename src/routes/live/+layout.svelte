<script lang="ts">
	import { tinykeys } from 'tinykeys';
	import '$lib/demo/styles.css';
	import '$lib/oneput/oneput-defaults.css';
	import '$lib/oneput/oneput-user-defined.css';
	import Oneput from '$lib/oneput/Oneput.svelte';
	import * as data from '$lib/demo/state.js';
	import { refreshIcons, setupDemoState } from '$lib/demo/state.svelte.js';
	import { onMount } from 'svelte';

	setupDemoState();

	let { children } = $props();

	const oneputState = $state({
		menuOpen: false
	});

	onMount(() => {
		refreshIcons();
	});

	$effect(() => {
		if (oneputState.menuOpen) {
			refreshIcons();
		}
	});

	$effect(() => {
		console.log('load tinykeys');
		tinykeys(document.body, {
			'$mod+k': () => {
				oneputState.menuOpen = !oneputState.menuOpen;
			}
		});
	});
</script>

<div class="app-container">
	<div class="content-area">
		{@render children()}
	</div>

	<div class="command-bar">
		<Oneput
			menuOpen={oneputState.menuOpen}
			menu={{
				header: data.menuHeader1,
				items: data.menuItems1,
				footer: data.menuFooter1
			}}
			inner={data.inner1}
			outer={data.outer1}
			input={{
				left: data.inputLeft1,
				right: data.inputRight1,
				outerLeft: data.inputOuterLeft1,
				outerRight: data.inputOuterRight1
			}}
			placeholder="Placeholder..."
			inputValue=""
			handleInputChange={() => {
				console.log('handleInputChange');
			}}
		/>
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
