<script lang="ts">
  import { resolve } from '$app/paths';
  import Anchor from '@oneput/oneput/shared/components/Anchor.svelte';
  import OneputController from '@oneput/oneput/shared/components/OneputController.svelte';
  import OneputCornerButton from '@oneput/oneput/shared/components/OneputCornerButton.svelte';
  import { icons } from '$lib/common/icons.js';
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
      The root menu is a view of the top-level machine (<code>appMachine.ts</code>).
    </li>
    <li>
      Each other screen is an invoked child machine. When it finishes, the parent goes back to the
      root menu.
    </li>
    <li>Screens: async search, and a KaTeX stub.</li>
  </ul>
  <p aria-live="polite"><small>Current state: <strong>{state}</strong></small></p>
</main>

<!-- The declarative page mounts its own controller. -->
<Anchor>
  <OneputController run={(ctl) => init(ctl, (next) => (state = next))} />
</Anchor>
<OneputCornerButton icon={icons.Command} />
