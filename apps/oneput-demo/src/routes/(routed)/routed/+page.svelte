<script lang="ts">
  import { resolve } from '$app/paths';
  import Anchor from '@oneput/oneput/shared/components/Anchor.svelte';
  import OneputController from '@oneput/oneput/shared/components/OneputController.svelte';
  import OneputCornerButton from '@oneput/oneput/shared/components/OneputCornerButton.svelte';
  import { icons } from '$lib/common/icons.js';
  import { watchState } from '$lib/common/watchState.js';
  import { init } from '$lib/routed/_init.js';

  let state = $state('');
</script>

<svelte:head>
  <title>Routed Oneput demo</title>
</svelte:head>

<main>
  <h1>Routed Oneput demo</h1>
  <p><a href={resolve('/')}>Open the main demo</a></p>
  <p>Open the menu with the button in the corner.</p>
  <ul>
    <li>
      A small XState machine (<code>machine.ts</code>) decides which AppObject Oneput shows.
    </li>
    <li>States: welcome, form (with child states editing and confirm), done, search.</li>
    <li>Each state has one AppObject, in a map with the shape of the machine.</li>
    <li>The AppObjects only send events (Next, Back, Restart, Search).</li>
    <li>
      When the state changes, <code>routeMachine</code> swaps in the AppObject for the new state.
    </li>
    <li>
      In form, "Pick a colour" opens a child AppObject on top. While it is open, nothing is swapped.
    </li>
  </ul>
  <p aria-live="polite"><small>Current state: <strong>{state}</strong></small></p>
</main>

<!-- The routed page mounts its own controller. -->
<Anchor>
  <OneputController
    run={(ctl) => {
      const { actor } = init(ctl);
      watchState(ctl, actor, (next) => (state = next));
    }}
  />
</Anchor>
<OneputCornerButton icon={icons.Command} />
