<script lang="ts">
  import { resolve } from '$app/paths';
  import { onDestroy } from 'svelte';
  import { createActor, type StateValue } from 'xstate';
  import type { AppObject, Controller } from '@oneput/oneput';
  import Anchor from '@oneput/oneput/shared/components/Anchor.svelte';
  import OneputController from '@oneput/oneput/shared/components/OneputController.svelte';
  import OneputCornerButton from '@oneput/oneput/shared/components/OneputCornerButton.svelte';
  import { icons } from '$lib/app/_icons.js';
  import { flowMachine, routeFlow } from '$lib/app/routed/flowMachine.js';
  import { Layout } from '$lib/app/_layout.js';

  // Each page visit owns its actor and router subscriptions.
  const actor = createActor(flowMachine);
  // Show a nested state as a path, for example 'form.confirm'.
  const pathOf = (value: StateValue): string =>
    typeof value === 'string'
      ? value
      : Object.entries(value)
          .map(([name, child]) => (child ? `${name}.${pathOf(child)}` : name))
          .join(', ');
  let state = $state(pathOf(actor.getSnapshot().value));
  const subscription = actor.subscribe((snapshot) => (state = pathOf(snapshot.value)));
  let routing: ReturnType<typeof routeFlow> | undefined;

  // OneputController needs an AppObject to run. routeFlow replaces it at once
  // with Welcome, so the stack is [Welcome] and Welcome is the root.
  function init(ctl: Controller): AppObject {
    return {
      layout: { layout: Layout.create, params: {} },
      settings: { enableGoBack: false },
      onStart() {
        actor.start();
        routing = routeFlow(ctl, actor);
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
  <p>
    Here a small XState state machine (<code>flowMachine.ts</code>) decides which AppObject Oneput
    shows. It has three states, welcome, form and done. The form state has two child states, editing
    and confirm. Each state has an AppObject, in a map with the shape of the machine. The AppObjects
    only send events to the machine (Next, Back, Restart); the machine changes state, and
    <code>routeMachine</code> replaces the AppObject with the one for the new state.
  </p>
  <p>
    Open the menu with the button in the corner. In the form, "Pick a colour" opens a child
    AppObject on top of the form. While it is open, the machine's AppObject is not replaced; close
    it to return to the form.
  </p>
  <p aria-live="polite"><small>Current state: <strong>{state}</strong></small></p>
</main>

<Anchor>
  <OneputController run={init} />
</Anchor>
<OneputCornerButton icon={icons.Command} />
