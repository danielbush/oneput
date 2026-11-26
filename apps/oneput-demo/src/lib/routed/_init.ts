import type { Controller } from '@oneput/oneput';
import { DynamicPlaceholder } from '@oneput/oneput/shared/ui/DynamicPlaceholder.js';
import { Layout } from '$lib/common/layout.js';
import { Online } from '$lib/common/online.js';
import { createRouter } from './router.js';

/** The infrastructure that the demo uses. Tests give the `createNull()` version. */
export type InitDeps = { online?: Online };

/**
 * Set up Oneput and the router for the routed demo page.
 * The router stops on destroy. Returns the actor of the router.
 * The router starts Welcome as the stack root. Welcome inherits the layout
 * that this function sets.
 */
export function init(ctl: Controller, { online = Online.create() }: InitDeps = {}) {
  // Before the router starts, so that `online` is disposed if the start throws.
  ctl.onDestroy(() => online.dispose());
  const router = createRouter({ online });

  const dynamicPlaceholder = DynamicPlaceholder.create(ctl, (params) =>
    params.menuOpenBinding
      ? params.isMenuOpen
        ? `Close menu with ${params.menuOpenBinding}...`
        : `Open menu with ${params.menuOpenBinding}...`
      : 'Type here...'
  );
  ctl.input.setDefaultPlaceholder(dynamicPlaceholder);

  ctl.ui.setLayout(Layout.create(ctl, {}));
  router.start(ctl);
  // A routed AppObject exited, which it should not do: tell the machine, then route again.
  ctl.app.setOnRootExit(() => {
    router.send({ type: 'EXITED' });
    router.reattach();
  });

  return { actor: router.actor };
}
