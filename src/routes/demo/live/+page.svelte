<script lang="ts">
	import VisualDebugControls from '$lib/demo/components/VisualDebugControls.svelte';
	import ForceDarkModeControls from '$lib/demo/components/ForceDarkMode.svelte';
	import { generateRandomText } from '$lib/demo/utils.js';
</script>

<main>
	<h1>Oneput Demo</h1>
	<VisualDebugControls />
	<ForceDarkModeControls />
	<section id="katex-demo"></section>
	<p>
		Here we pretend we are an app that oneput is managing. The command bar is now anchored to the
		bottom of the screen and will stay visible while this content scrolls.
	</p>

	<br />

	<h2>Heading 2</h2>
	<p>{generateRandomText(1, 5)}</p>
	<h2>Heading 3</h2>
	<p>{generateRandomText(1, 5)}</p>
	<h3>Heading 3.1</h3>
	<p>{generateRandomText(1, 5)}</p>
	<h2>Heading 4</h2>
	<p>{generateRandomText(1, 5)}</p>
	<h3>Heading 4.1</h3>
	<p>{generateRandomText(1, 5)}</p>
	<h3>Heading 4.2</h3>
	<p>{generateRandomText(1, 5)}</p>
	<h4>Heading 4.2.1</h4>
	<p>{generateRandomText(1, 5)}</p>
	<h2>Heading 5</h2>
	<p>{generateRandomText(1, 5)}</p>
	<h3>Heading 5.1</h3>
	<p>{generateRandomText(1, 5)}</p>
	<h3>Heading 5.2</h3>
	<p>{generateRandomText(1, 5)}</p>
	<h3>Heading 5.3</h3>
	<p>{generateRandomText(1, 5)}</p>
	<h2>Heading 6</h2>
	<p>{generateRandomText(1, 5)}</p>
	<h2>Heading 7</h2>
	<p>{generateRandomText(1, 5)}</p>
	<h2>Heading 8</h2>
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
