<script lang="ts">
  import { resolve } from '$app/paths';
  import Anchor from '@oneput/oneput/shared/components/Anchor.svelte';
  import OneputController from '@oneput/oneput/shared/components/OneputController.svelte';
  import OneputCornerButton from '@oneput/oneput/shared/components/OneputCornerButton.svelte';
  import { icons } from '$lib/common/icons.js';
  import { watchState } from '$lib/common/watchState.js';
  import { init } from '$lib/declarative/_init.js';

  let state = $state('');
</script>

<svelte:head>
  <title>Declarative Oneput demo</title>
</svelte:head>

<main>
  <h1>Declarative Oneput demo</h1>
  <p><a href={resolve('/')}>Open the main demo</a></p>
  <p>Open the menu with the button in the corner.</p>
  <ul>
    <li>
      Every screen is a declarative AppObject: an XState machine whose states describe what Oneput
      shows. There are no imperative AppObject classes.
    </li>
    <li>
      The top-level machine (<code>machine.ts</code>) has no views. It invokes
      <code>rootMenu</code>,
      <code>asyncSearch</code> and <code>katex</code> as child machines.
    </li>
    <li>When a demo finishes, the parent goes back to the root menu.</li>
    <li>Screens: async search, and KaTeX.</li>
  </ul>
  <p aria-live="polite"><small>Current state: <strong>{state}</strong></small></p>
  <!-- The KaTeX demo inserts formulas here. -->
  <section id="katex-demo"></section>
</main>

<!-- The declarative page mounts its own controller. -->
<Anchor>
  <OneputController
    run={(ctl) => {
      const { actor } = init(ctl);
      watchState(ctl, actor, (next) => (state = next));
    }}
  />
</Anchor>
<OneputCornerButton icon={icons.Command} />
