<script lang="ts">
  import '$lib/jsed/styles/oneput-defaults.css';
  import '@oneput/jsed/styles/jsed-defaults.css';
  import { JSED_APP_ROOT_ID } from '@oneput/jsed';
  import type { Controller } from '@oneput/oneput';
  import Anchor from '@oneput/oneput/shared/components/Anchor.svelte';
  import OneputController from '@oneput/oneput/shared/components/OneputController.svelte';
  import OneputCornerButton from '@oneput/oneput/shared/components/OneputCornerButton.svelte';
  import { icons } from '@oneput/jsed';
  import { Root } from '$lib/oneput/app/Root.js';

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

<div id={JSED_APP_ROOT_ID}>
  <Anchor>
    <OneputController run={(ctl: Controller) => Root.create(ctl)} />
  </Anchor>
  <OneputCornerButton icon={icons.Command} />
</div>
