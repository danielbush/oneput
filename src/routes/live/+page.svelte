<script lang="ts">
	import '../../lib/oneput/oneput-defaults.css';
	import '../../lib/oneput/oneput-user-defined.css';
	import Oneput from '../../lib/oneput/Oneput.svelte';
	import * as data from '../../lib/oneput/examples/demo/index.js';
	import { demoState } from '$lib/demo-state.svelte.js';
	import VisualDebugControls from '$lib/components/VisualDebugControls.svelte';
	import ForceDarkModeControls from '$lib/components/ForceDarkMode.svelte';
</script>

<main class={[demoState.visualDebug && 'oneput__debug']}>
	<h1>Oneput Demo</h1>
	<VisualDebugControls />
	<ForceDarkModeControls />

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
