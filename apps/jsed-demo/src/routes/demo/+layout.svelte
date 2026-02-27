<script lang="ts">
  import '$lib/jsed/styles/oneput-defaults.css';
  import '$lib/jsed/styles/jsed-defaults.css';
  import { JSED_DOM_ROOT_ID } from '@oneput/jsed';
  import { Anchor, OneputCornerButton, OneputController, Controller } from '@oneput/oneput';
  import { icons } from '$lib/oneput/icons.js';
  import { Root } from '$lib/oneput/app/root.js';

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
<div id={JSED_DOM_ROOT_ID}>
  <Anchor>
    <OneputController run={(ctl: Controller) => Root.create(ctl)} />
  </Anchor>
  <OneputCornerButton icon={icons.Command} />
</div>
