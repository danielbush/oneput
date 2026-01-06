<script lang="ts">
	import '../../../lib/jsed/styles/oneput-defaults.css';
	import '../../../lib/jsed/styles/jsed-defaults.css';
	import { Anchor, OneputCornerButton, OneputController } from '$oneput';
	import { setController } from '$lib/oneput/app/_app.js';
	import { icons } from '$lib/oneput/icons.js';

	let { children } = $props();
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
<OneputCornerButton icon={icons.Command} />
