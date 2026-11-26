import { createActor, type StateValue } from 'xstate';
import type { AppObject, Controller } from '@oneput/oneput';
import { DynamicPlaceholder } from '@oneput/oneput/shared/ui/DynamicPlaceholder.js';
import { Layout } from '$lib/common/layout.js';
import { Online } from '$lib/common/online.js';
import { createFlowRouter } from './router.js';

/** Format an XState state value as a dot-separated path, for example `form.confirm`. */
function pathOf(value: StateValue): string {
  return typeof value === 'string'
    ? value
    : Object.entries(value)
        .map(([name, child]) => (child ? `${name}.${pathOf(child)}` : name))
        .join(', ');
}

/**
 * Set up Oneput and the XState flow actor for the routed demo page.
 * Subscribes to machine state changes and tears down on destroy.
 * OneputController needs an AppObject to run; the router replaces it at once
 * with Welcome, so the stack is [Welcome] and Welcome is the root.
 */
export function init(ctl: Controller, onStateChange?: (state: string) => void): AppObject {
  const online = Online.create();
  const router = createFlowRouter({ online });
  const actor = createActor(router.machine);
  let routing: ReturnType<typeof router.route> | undefined;

  onStateChange?.(pathOf(actor.getSnapshot().value));
  const subscription = actor.subscribe((snapshot) => {
    onStateChange?.(pathOf(snapshot.value));
  });

  ctl.onDestroy(() => {
    routing?.stop();
    subscription.unsubscribe();
    actor.stop();
    online.dispose();
  });

  const dynamicPlaceholder = DynamicPlaceholder.create(ctl, (params) =>
    params.menuOpenBinding
      ? params.isMenuOpen
        ? `Close menu with ${params.menuOpenBinding}...`
        : `Open menu with ${params.menuOpenBinding}...`
      : 'Type here...'
  );
  ctl.input.setDefaultPlaceholder(dynamicPlaceholder);

  return {
    layout: { layout: Layout.create, params: {} },
    settings: { enableGoBack: false },
    onStart() {
      actor.start();
      routing = router.route(ctl, actor);
      // A routed AppObject exited: the stack is empty and routeApp has
      // stopped. Tell the machine, then route again from its new state.
      ctl.app.setOnRootExit(() => {
        actor.send({ type: 'EXITED' });
        routing = router.route(ctl, actor);
      });
    }
  };
}
