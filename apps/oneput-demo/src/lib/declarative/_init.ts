import type { Controller } from '@oneput/oneput';
import { DynamicPlaceholder } from '@oneput/oneput/shared/ui/DynamicPlaceholder.js';
import { Layout } from '$lib/common/layout.js';
import { Online } from '$lib/common/online.js';
import { SearchService } from '$lib/service/SearchService.js';
import { DemoDocument } from '$lib/shared/katex/katex.js';
import { createRouter } from './router.js';

/** The infrastructure that the demo uses. Tests give the `createNull()` versions. */
export type InitDeps = { online?: Online; search?: SearchService; doc?: DemoDocument };

/**
 * Set up Oneput and the router for the declarative demo page.
 * The router stops on destroy. Returns the actor of the router.
 * The router starts the declarative root menu as the stack root. The root
 * menu inherits the layout that this function sets.
 * There is no root-exit handler: the declarative AppObjects never exit, and
 * a handler would give the root menu a Back button.
 */
export function init(
  ctl: Controller,
  {
    online = Online.create(),
    search = SearchService.create(),
    doc = DemoDocument.create()
  }: InitDeps = {}
) {
  // Before the router starts, so that `online` is disposed if the start throws.
  ctl.onDestroy(() => online.dispose());
  const router = createRouter({ search, online, doc });

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

  return { actor: router.actor };
}
