<script lang="ts">
  import { Anchor, Controller, OneputController, OneputCornerButton } from '@oneput/oneput';
  import '@oneput/oneput/demo/styles.css';
  import '@oneput/oneput/shared/styles/oneput-defaults.css';
  import { icons } from '$lib/icons.js';
  import { RootUI } from '$lib/app/root.js';

  // Pretend the code here could be something outside of svelte.
  // We create a layout and we add OneputWrapper eg as a web component.
  // We then get the controller from OneputWrapper and bootstrap our
  // oneput-based world.
  let { children } = $props();
</script>

{@render children()}
<Anchor>
  <OneputController run={(ctl: Controller) => RootUI.create(ctl)} />
</Anchor>
<OneputCornerButton icon={icons.Command} />
