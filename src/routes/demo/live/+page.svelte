<script lang="ts">
	import VisualDebugControls from '$lib/demo/components/VisualDebugControls.svelte';
	import ForceDarkModeControls from '$lib/demo/components/ForceDarkMode.svelte';
	import { generateRandomText } from '$lib/demo/utils.js';
</script>

<main>
	<h1>Oneput Demo</h1>
	<VisualDebugControls />
	<ForceDarkModeControls />
	<section id="page-content"></section>
	<p>
		Here we pretend we are an app that oneput is managing. The command bar is now anchored to the
		bottom of the screen and will stay visible while this content scrolls.
	</p>

	<br />

	<h2>&sect; 1</h2>
	<p>{generateRandomText(1, 5)}</p>
	<h2>&sect; 2</h2>
	<p>{generateRandomText(1, 5)}</p>
	<h3>&sect; 2.1</h3>
	<p>{generateRandomText(1, 5)}</p>
	<h2>&sect; 3</h2>
	<p>{generateRandomText(1, 5)}</p>
	<h3>&sect; 3.1</h3>
	<p>{generateRandomText(1, 5)}</p>
	<h3>&sect; 3.2</h3>
	<p>{generateRandomText(1, 5)}</p>
	<h4>&sect; 3.2.1</h4>
	<p>{generateRandomText(1, 5)}</p>
	<h2>&sect; 4</h2>
	<p>{generateRandomText(1, 5)}</p>
	<h3>&sect; 4.1</h3>
	<p>{generateRandomText(1, 5)}</p>
	<h3>&sect; 4.2</h3>
	<p>{generateRandomText(1, 5)}</p>
	<h3>&sect; 4.3</h3>
	<p>{generateRandomText(1, 5)}</p>
	<h2>&sect; 5</h2>
	<p>{generateRandomText(1, 5)}</p>
	<h2>&sect; 6</h2>
	<p>{generateRandomText(1, 5)}</p>
	<h2>&sect; 7</h2>
	<p>{generateRandomText(1, 5)}</p>
</main>

<style>
	h1,
	h2,
	h3,
	h4 {
		margin: 1rem 0;
	}
	main {
		padding-bottom: 1rem;
	}
</style>
