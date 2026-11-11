import type { Controller } from '../../controllers/controller.js';
import type { Pull } from '../../lib/pull.js';
import type { AppObject } from '../../types.js';

/**
 * Run the first route above the caller, then replace it when the source changes.
 * A child keeps control until the route resumes. Leaving the route's stack
 * stops both subscriptions; `stop` also detaches without changing the stack.
 * See ROUTED_MODE in docs/CONCEPTS.md.
 *
 * @param ctl The Oneput controller.
 * @param source What routeApp follows, as a Pull. `get()` returns the value
 *   that routeApp gives to `appFor` now (for example, the state of a state
 *   machine). `subscribe(onChange)` calls `onChange` when that value changes
 *   and returns a function that unsubscribes. Wrap an XState actor in Pull:
 *   `get` returns `actor.getSnapshot()` (the value is the snapshot), and
 *   `subscribe` turns `actor.subscribe(...)` into a function that unsubscribes.
 * @param appFor Makes the AppObject for a value, for example from a map of
 *   state name to AppObject.
 * @param key Optional. Returns the part of `value` (what `source.get()`
 *   returned) that decides which AppObject to show, for example the state
 *   name. routeApp replaces the AppObject only when this part changes.
 *   `appFor` still gets all of `value`. Without `key`, routeApp compares all
 *   of `value` with Object.is. XState makes a new snapshot object on each
 *   change, so without `key` a context change in the same state also replaces
 *   the AppObject.
 * @returns `{ stop }`, which detaches routeApp without changing the stack.
 */
export function routeApp<T, K = T>(
  ctl: Controller,
  source: Required<Pull<T>>,
  appFor: (value: T) => AppObject,
  key?: (value: T) => K
): { stop: () => void } {
  const keyOf = (value: T) => (key ? key(value) : value);
  const initial = source.get();
  let routed = appFor(initial);
  let routedKey = keyOf(initial);
  let stopped = false;
  // Hooks and app-change listeners can synchronously change the source.
  let transitioning = true;

  const stop = () => {
    if (stopped) return;
    stopped = true;
    unsubscribeSource();
    unsubscribeApp();
  };

  const sync = () => {
    if (transitioning || stopped) return;
    transitioning = true;
    try {
      while (!stopped) {
        if (!ctl.app.contains(routed)) {
          stop();
          return;
        }
        if (!ctl.app.isCurrent(routed)) return;
        const value = source.get();
        const nextKey = keyOf(value);
        if (Object.is(routedKey, nextKey)) return;
        routed = appFor(value);
        routedKey = nextKey;
        ctl.app.replace(routed);
      }
    } finally {
      transitioning = false;
    }
  };

  const unsubscribeSource = source.subscribe(sync);
  const unsubscribeApp = ctl.events.on('app-change', sync);
  try {
    ctl.app.run(routed);
  } finally {
    transitioning = false;
    sync();
  }
  return { stop };
}
