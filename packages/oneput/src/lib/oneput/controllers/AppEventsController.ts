import type { AppEvent, AppEventPayload, AppEventType } from '../types.js';

/**
 * Bus for host app / user created events.
 *
 * Host app UI rendered outside of Oneput (e.g. a node on a canvas) can emit custom events
 * with `emit`.
 *
 *     // host UI outside Oneput
 *     ctl.appEvents.emit({ type: 'node-click', payload: { id: 'n1' } });
 *
 *     // the AppObject, while it is current
 *     events = {
 *       'node-click': ({ id }) => this.select(id)
 *     } satisfies AppEventHandlers;
 *
 *     // anything that must run whichever AppObject is current
 *     const off = ctl.appEvents.on('node-click', ({ id }) => this.select(id));
 *
 * - An AppObject declares an `events` map and the framework wires it while that
 * AppObject is current
 * - Other objects that have different lifecycles, such as an app's own
 * behaviour object, subscribe with `on` and own the returned unsubscribe.
 *
 * Kept apart from `ctl.events`, which carries Oneput's internal events. Host
 * apps own the event names, declared in the `AppEventMap` interface.
 */
export class AppEventsController {
  private listeners = new Map<string, Set<(payload: never) => void>>();
  private anyListeners = new Set<(event: AppEvent) => void>();

  /** Publish one host-app event to every subscriber. */
  emit(event: AppEvent) {
    for (const listener of [...this.anyListeners]) {
      listener(event);
    }
    const typed = this.listeners.get(event.type);
    if (!typed) {
      return;
    }
    for (const listener of [...typed]) {
      (listener as (payload: unknown) => void)(event.payload);
    }
  }

  /**
   * Subscribe to one event name. Returns the unsubscribe.
   *
   * The handler receives the payload, because the name is already known.
   */
  on<K extends AppEventType>(type: K, handler: (payload: AppEventPayload<K>) => void) {
    const typed = this.listeners.get(type) ?? new Set();
    this.listeners.set(type, typed);
    typed.add(handler as (payload: never) => void);
    return () => {
      typed.delete(handler as (payload: never) => void);
    };
  }

  /**
   * Subscribe to every event name. Returns the unsubscribe.
   *
   * Used by AppController to route events to the current AppObject. Prefer
   * `on` in app code, so a subscriber states which events it needs.
   */
  onAny(handler: (event: AppEvent) => void) {
    this.anyListeners.add(handler);
    return () => {
      this.anyListeners.delete(handler);
    };
  }
}
