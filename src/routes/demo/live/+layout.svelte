<script lang="ts">
	import '../../../lib/jsed/styles/oneput-defaults.css';
	import '../../../lib/jsed/styles/jsed-defaults.css';
	import { Command } from '@lucide/svelte';
	import { Anchor, OneputCornerButton, OneputController } from '$oneput';
	import { setController } from '$lib/demo/live/app.js';

	let { children } = $props();
	setTimeout(() => {
		window.dispatchEvent(new Event('oneput-toggle-hide'));
	}, 10);
</script>

<svelte:head>
	<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.11.1/katex.min.css" />
	<!-- <link
      rel="stylesheet"
      href="https://cdnjs.cloudflare.com/ajax/libs/github-markdown-css/4.0.0/github-markdown.min.css"
    /> -->
</svelte:head>

{@render children()}
<Anchor>
	<OneputController controllerRef={setController} />
</Anchor>
<OneputCornerButton>
	{#snippet icon()}<Command />{/snippet}
</OneputCornerButton>
