import type { Controller } from '../controllers/controller.js';
import type { Pull } from '../lib/pull.js';
import type { AppObject } from '../types.js';

/**
 * Run the first route above the caller, then replace it when the source changes.
 * A child keeps control until the route resumes. Leaving the route's stack
 * stops both subscriptions; `stop` also detaches without changing the stack.
 * The key defaults to the source value and is compared with Object.is.
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
