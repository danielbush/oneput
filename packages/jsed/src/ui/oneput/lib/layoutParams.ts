import type { AppLayoutParams } from '@oneput/oneput';

/**
 * Layout params that jsed's Oneput AppObjects expect a host layout to accept.
 *
 * The host installs the chrome layout (e.g. StandardLayout). {@link JsedUI}
 * installs {@link JsedUILayout}, which wraps that host layout and adds FOCUS
 * nav crumbs as `innerUI`.
 *
 * apps/jsed-demo/src/lib/oneput/app/_layout.ts is the layout that jsed-demo uses.
 * It is compatible with JsedLayoutParams.
 */
export type JsedLayoutParams = AppLayoutParams;
