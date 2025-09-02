<script lang="ts">
	import '$lib/demo/styles.css';
	import '$lib/oneput/oneput-defaults.css';
	import '$lib/oneput/oneput-user-defined.css';
	import Oneput from '$lib/oneput/Oneput.svelte';
	import * as ui from '$lib/demo/ui.js';
	import * as data from '$lib/demo/visual/state.js';
	import { setupDemoState } from '$lib/demo/visual/state.svelte.js';

	const oneputState = setupDemoState();

	let { children } = $props();
</script>

<div class="app-container">
	<div class="content-area">
		{@render children()}
	</div>

	<div class="command-bar">
		<Oneput
			menuOpen={oneputState.menuOpen}
			menu={{
				header: ui.menuHeader1,
				items: ui.menuItems1(),
				footer: ui.menuFooter1(data.appState.zap)
			}}
			inner={ui.inner1}
			outer={ui.outer1(data.appState.zap)}
			input={{
				left: ui.inputLeft1,
				right: ui.inputRight1,
				outerLeft: ui.inputOuterLeft1,
				outerRight: ui.inputOuterRight1
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
