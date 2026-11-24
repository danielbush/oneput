import { createActor, type StateValue } from 'xstate';
import type { AppObject, Controller } from '@oneput/oneput';
import { DynamicPlaceholder } from '@oneput/oneput/shared/ui/DynamicPlaceholder.js';
import { Layout } from '$lib/common/layout.js';
import { Online } from '$lib/common/online.js';
import { flowMachine, routeFlow } from './flowMachine.js';

/** Format an XState state value as a dot-separated path, for example `form.confirm`. */
function pathOf(value: StateValue): string {
  return typeof value === 'string'
    ? value
    : Object.entries(value)
        .map(([name, child]) => (child ? `${name}.${pathOf(child)}` : name))
        .join(', ');
}

/**
 * Create the Oneput and XState setup for the routed demo page.
 * Returns `initialState` for the initial render and `init` for `OneputController`,
 * which subscribes and tears down on mount and destroy.
 */
export function createRoutedDemo(onStateChange?: (state: string) => void): {
  initialState: string;
  init: (ctl: Controller) => AppObject;
} {
  const actor = createActor(flowMachine);

  // OneputController needs an AppObject to run. routeFlow replaces it at once
  // with Welcome, so the stack is [Welcome] and Welcome is the root.
  function init(ctl: Controller): AppObject {
    const online = Online.create();
    let routing: ReturnType<typeof routeFlow> | undefined;

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
        routing = routeFlow(ctl, actor, online);
        // A routed AppObject exited: the stack is empty and routeApp has
        // stopped. Tell the machine, then route again from its new state.
        ctl.app.setOnRootExit(() => {
          actor.send({ type: 'EXITED' });
          routing = routeFlow(ctl, actor, online);
        });
      }
    };
  }

  return {
    initialState: pathOf(actor.getSnapshot().value),
    init
  };
}
