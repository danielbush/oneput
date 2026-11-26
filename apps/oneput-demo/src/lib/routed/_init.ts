import type { Controller } from '@oneput/oneput';
import { DynamicPlaceholder } from '@oneput/oneput/shared/ui/DynamicPlaceholder.js';
import { Layout } from '$lib/common/layout.js';
import { Online } from '$lib/common/online.js';
import { createRouter } from './router.js';

/** The infrastructure that the demo uses. Tests give the `createNull()` version. */
export type InitDeps = { online?: Online };

/**
 * Set up Oneput and the router for the routed demo page.
 * Subscribes to state changes and tears down on destroy.
 * The router starts Welcome as the stack root. Welcome inherits the layout
 * that this function sets.
 */
export function init(
  ctl: Controller,
  onStateChange?: (state: string) => void,
  { online = Online.create() }: InitDeps = {}
): void {
  const router = createRouter({ online });
  const unsubscribe = router.onState((state) => onStateChange?.(state));

  ctl.onDestroy(() => {
    unsubscribe();
    router.stop();
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

  ctl.ui.setLayout(Layout.create(ctl, {}));
  router.start(ctl);
  // A routed AppObject exited, which it should not do.
  ctl.app.setOnRootExit(() => router.recoverFromExit(ctl));
}
