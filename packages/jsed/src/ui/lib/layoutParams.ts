/**
 * Layout params that jsed's Oneput AppObjects expect a host layout to accept.
 *
 * Jsed does not own the actual Oneput layout; the host app provides it via
 * AppObject.layout inheritance. These params describe the small shared contract
 * jsed needs when it configures that inherited layout.
 *
 * apps/jsed-demo/src/lib/oneput/app/_layout.ts is the layout that jsed-demo uses.
 * It is compatible with JsedLayoutParams.
 */
export type JsedLayoutParams = {
  menuTitle?: string;
};
