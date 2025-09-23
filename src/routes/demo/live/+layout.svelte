<script lang="ts">
	import { Anchor, OneputCornerButton, OneputController, Controller } from '$oneput';
	import '../../../lib/jsed/styles/jsed-defaults.css';

	let { children } = $props();
	let controller: Controller | null = null;
	function setController(ctl: Controller) {
		controller = ctl;
		console.log('controller', controller);
	}
	import { Command } from '@lucide/svelte';
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
