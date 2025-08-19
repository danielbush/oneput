<script lang="ts">
	import VisualDebugControls from '$lib/demo/components/VisualDebugControls.svelte';
	import ForceDarkModeControls from '$lib/demo/components/ForceDarkMode.svelte';
</script>

<main>
	<h1>Oneput Demo</h1>
	<VisualDebugControls />
	<ForceDarkModeControls />
	<p>Here we pretend we are an app that oneput is managing.</p>

	<br />

	<!-- Additional content can go here -->
	<p>
		The command bar is now anchored to the bottom of the screen and will stay visible while this
		content scrolls.
	</p>

	<!-- Add some demo content to show scrolling behavior -->
	{#each Array(20), i (i)}
		<p>
			Demo content line {i + 1} - This content will scroll while the command bar stays anchored at the
			bottom.
		</p>
	{/each}
</main>
