<script lang="ts">
  import Anchor from '@oneput/oneput/shared/components/Anchor.svelte';
  import OneputController from '@oneput/oneput/shared/components/OneputController.svelte';
  import OneputCornerButton from '@oneput/oneput/shared/components/OneputCornerButton.svelte';
  import { icons } from '$lib/common/_icons.js';
  import { init } from '$lib/main/_init.js';
  import { Online } from '$lib/common/online.js';
  import type { Controller } from '@oneput/oneput';
  import { onDestroy } from 'svelte';

  // Pretend the code here could be something outside of svelte.
  // We create a layout and we add OneputWrapper eg as a web component.
  // We then get the controller from OneputWrapper and bootstrap our
  // oneput-based world.
  let { children } = $props();

  // This mount owns the online signal and stops it when it unmounts.
  let online: Online | undefined;
  function run(ctl: Controller) {
    online = Online.create();
    return init(ctl, online);
  }
  onDestroy(() => online?.dispose());
</script>

{@render children()}
<Anchor>
  <OneputController {run} />
</Anchor>
<OneputCornerButton icon={icons.Command} />
