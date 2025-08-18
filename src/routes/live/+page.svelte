<script lang="ts">
	import '../../lib/oneput/oneput-defaults.css';
	import '../../lib/oneput/oneput-user-defined.css';
	import Oneput from '../../lib/oneput/Oneput.svelte';
	import * as data from '../../lib/oneput/examples/demo/index.js';
	import { demoState } from '$lib/demo-state.svelte.js';
</script>

<main class={[demoState.visualDebug && 'oneput__debug']}>
	<h1>Oneput Demo</h1>
	<div class="demo-controls">
		<fieldset>
			<button type="button" onclick={demoState.toggleVisualDebug}> Toggle visual debug </button>
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

	<Oneput
		menuOpen={true}
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
</main>
