<script lang="ts">
  import Anchor from '@oneput/oneput/shared/components/Anchor.svelte';
  import OneputController from '@oneput/oneput/shared/components/OneputController.svelte';
  import OneputCornerButton from '@oneput/oneput/shared/components/OneputCornerButton.svelte';
  import '@oneput/oneput/demo/styles.css';
  import '@oneput/oneput/shared/styles/oneput-defaults.css';
  import { icons } from '$lib/app/_icons.js';
  import { init } from '$lib/app/_init.js';

  // Pretend the code here could be something outside of svelte.
  // We create a layout and we add OneputWrapper eg as a web component.
  // We then get the controller from OneputWrapper and bootstrap our
  // oneput-based world.
  let { children } = $props();
</script>

{@render children()}
<Anchor>
  <OneputController run={init} />
</Anchor>
<OneputCornerButton icon={icons.Command} />
