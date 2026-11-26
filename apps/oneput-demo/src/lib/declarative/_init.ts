import { createActor } from 'xstate';
import type { AppObject, Controller } from '@oneput/oneput';
import { DynamicPlaceholder } from '@oneput/oneput/shared/ui/DynamicPlaceholder.js';
import { Layout } from '$lib/common/layout.js';
import { Online } from '$lib/common/online.js';
import { SearchService } from '$lib/service/SearchService.js';
import { createAppMachine, routeAppFlow } from './router.js';

/** The infrastructure that the demo uses. Tests give the `createNull()` versions. */
export type InitDeps = { online?: Online; search?: SearchService };

/**
 * Set up Oneput and the XState actor for the declarative demo page.
 * Subscribes to machine state changes and tears down on destroy.
 * OneputController needs an AppObject to run; routeAppFlow replaces it at
 * once with the declarative root menu, which becomes the stack root.
 * There is no root-exit handler: the declarative AppObjects never exit, and
 * a handler would give the root menu a Back button.
 */
export function init(
  ctl: Controller,
  onStateChange?: (state: string) => void,
  { online = Online.create(), search = SearchService.create() }: InitDeps = {}
): AppObject {
  const actor = createActor(createAppMachine(search));
  let routing: ReturnType<typeof routeAppFlow> | undefined;

  onStateChange?.(actor.getSnapshot().value);
  const subscription = actor.subscribe((snapshot) => {
    onStateChange?.(snapshot.value);
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
      routing = routeAppFlow(ctl, actor, online);
    }
  };
}
