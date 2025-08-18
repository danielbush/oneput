<script lang="ts">
	import '../../lib/oneput/oneput-defaults.css';
	import '../../lib/oneput/oneput-user-defined.css';
	import Oneput from '../../lib/oneput/Oneput.svelte';
	import * as data from '../../lib/oneput/examples/demo/index.js';
	import { demoState } from '$lib/demo-state.svelte.js';
</script>

<main>
	<h1>Oneput Visual States</h1>
	<p>Demo visual states for Oneput component</p>
	<div class="demo-controls">
		<fieldset>
			<button type="button" onclick={demoState.toggleVisualDebug}>
				Toggle visual debug
			</button>
			<ul>
				<li>Highlights hflex, vflex and fchild</li>
				<li>
					You can adjust the debug styling in oneput-defaults.css - look for the
					<code>.oneput__debug</code> class.
				</li>
			</ul>
		</fieldset>
		<fieldset>
			<button type="button" onclick={demoState.toggleForceDarkMode}>
				Toggle force dark mode on page
			</button>
		</fieldset>
	</div>

	<br />

	<section class={['demo-grid', demoState.visualDebug && 'oneput__debug']}>
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
					inputValue={''}
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
					inputValue={''}
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
