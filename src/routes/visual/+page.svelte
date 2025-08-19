<script lang="ts">
	import '../../demo-styles.css';
	import '$lib/oneput/oneput-defaults.css';
	import '$lib/oneput/oneput-user-defined.css';
	import Oneput from '$lib/oneput/Oneput.svelte';
	import * as data from '$lib/demo/index.js';
	import { refreshIcons, setupDemoState } from '$lib/demo/state.svelte.js';
	import VisualDebugControls from '$lib/demo/components/VisualDebugControls.svelte';
	import ForceDarkModeControls from '$lib/demo/components/ForceDarkMode.svelte';
	import { onMount } from 'svelte';

	setupDemoState();

	onMount(() => {
		refreshIcons();
	});
</script>

<main>
	<h1>Oneput Visual States</h1>
	<p>Demo visual states for Oneput component</p>
	<VisualDebugControls />
	<ForceDarkModeControls />

	<br />

	<section class="demo-grid">
		<section class="demo-example">
			<h2>Everything showing</h2>
			{#snippet demo1(menuOpen: boolean)}
				<Oneput
					{menuOpen}
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
			{/snippet}
			{@render demo1(false)}
			<p>Menu open</p>
			{@render demo1(true)}
		</section>

		<section class="demo-example">
			<h2>Minimal</h2>
			{#snippet demo1(menuOpen: boolean)}
				<Oneput
					{menuOpen}
					menu={{
						items: data.menuItems1
					}}
					placeholder="Placeholder..."
					inputValue=""
					handleInputChange={() => {
						console.log('handleInputChange');
					}}
				/>
			{/snippet}
			{@render demo1(false)}
			<p>Menu open</p>
			{@render demo1(true)}
		</section>
	</section>
</main>
