import type { AppObject, Controller } from '@oneput/oneput';
import { DynamicPlaceholder } from '@oneput/oneput/shared/ui/DynamicPlaceholder.js';
import { Layout } from '$lib/common/layout.js';
import { Online } from '$lib/common/online.js';
import { createRouter } from './router.js';

/**
 * Set up Oneput and the router for the routed demo page.
 * Subscribes to state changes and tears down on destroy.
 * OneputController needs an AppObject to run; the router replaces it at once
 * with Welcome, so the stack is [Welcome] and Welcome is the root.
 */
export function init(ctl: Controller, onStateChange?: (state: string) => void): AppObject {
  const online = Online.create();
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

  return {
    layout: { layout: Layout.create, params: {} },
    settings: { enableGoBack: false },
    onStart() {
      router.start(ctl);
      // A routed AppObject exited, which it should not do.
      ctl.app.setOnRootExit(() => router.recoverFromExit(ctl));
    }
  };
}
