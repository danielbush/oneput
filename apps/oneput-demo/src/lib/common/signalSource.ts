import type { ReadableSource } from '@oneput/oneput/shared/declarative/interpreter.js';
import { Signal } from 'signal-polyfill';

/** Read the signal so that it tracks its sources. A throw shows on the view's own read. */
function track(signal: Signal.State<unknown> | Signal.Computed<unknown>) {
  try {
    signal.get();
  } catch {
    // The view reads the signal with `get`, which throws the same error there.
  }
}

/**
 * Read a signal as a Oneput readable source; mark it with `readable` in a view's sources. `subscribe` calls `onChange` in a
 * microtask after the signal changes, because a watcher must not read signals
 * while it is notified. Once unsubscribed, a queued call does nothing.
 */
export function signalSource<T>(signal: Signal.State<T> | Signal.Computed<T>): ReadableSource<T> {
  return {
    get: () => signal.get(),
    subscribe(onChange) {
      let queued = false;
      let subscribed = true;
      const watcher = new Signal.subtle.Watcher(() => {
        if (queued) return;
        queued = true;
        queueMicrotask(() => {
          queued = false;
          if (!subscribed) return;
          // Read the signal again and reset the watcher, so the next change notifies.
          track(signal);
          watcher.watch();
          onChange();
        });
      });
      watcher.watch(signal);
      track(signal);
      return () => {
        subscribed = false;
        watcher.unwatch(signal);
      };
    }
  };
}
