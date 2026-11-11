<script lang="ts">
  import { resolve } from '$app/paths';
  import { onDestroy } from 'svelte';
  import { createActor } from 'xstate';
  import type { AppObject, Controller } from '@oneput/oneput';
  import Anchor from '@oneput/oneput/shared/components/Anchor.svelte';
  import OneputController from '@oneput/oneput/shared/components/OneputController.svelte';
  import { flowMachine, routeFlow } from '$lib/app/routed/flowMachine.js';
  import { Layout } from '$lib/app/_layout.js';

  // Each page visit owns its actor and router subscriptions.
  const actor = createActor(flowMachine);
  let state = $state(actor.getSnapshot().value);
  const subscription = actor.subscribe((snapshot) => (state = snapshot.value));
  let routing: ReturnType<typeof routeFlow> | undefined;

  function init(ctl: Controller): AppObject {
    return {
      layout: { layout: Layout.create, params: {} },
      settings: { enableGoBack: false },
      onStart() {
        actor.start();
        routing = routeFlow(ctl, actor);
        ctl.menu.openMenu();
      }
    };
  }

  onDestroy(() => {
    routing?.stop();
    subscription.unsubscribe();
    actor.stop();
  });
</script>

<svelte:head>
  <title>Routed Oneput demo</title>
</svelte:head>

<main>
  <h1>Routed Oneput demo</h1>
  <p><a href={resolve('/')}>Open the main demo</a></p>
  <p>Use the Oneput menu to move from welcome to form to done.</p>
  <p>The colour picker opens above the form. Close it to return to the form.</p>
  <p aria-live="polite"><small>Current state: <strong>{state}</strong></small></p>
</main>

<Anchor>
  <OneputController run={init} />
</Anchor>
