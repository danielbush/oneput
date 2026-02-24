<script lang="ts">
  import { Anchor, OneputController, OneputCornerButton } from '@oneput/oneput';
  import { setController } from '$lib/demo/live/app/_app.js';
  import '@oneput/oneput/demo/styles.css';
  import '@oneput/oneput/shared/styles/oneput-defaults.css';
  import { icons } from '$lib/demo/live/icons.js';

  // Pretend the code here could be something outside of svelte.
  // We create a layout and we add OneputWrapper eg as a web component.
  // We then get the controller from OneputWrapper and bootstrap our
  // oneput-based world.
  let { children } = $props();
</script>

{@render children()}
<Anchor>
  <OneputController controllerRef={setController} />
</Anchor>
<OneputCornerButton icon={icons.Command} />
