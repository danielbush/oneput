/**
 * Pull state for mounted widgets.
 *
 * A menu row that must change without a menu rebuild reads its value from a
 * {@link Pull} source each time it paints. The caller keeps the state; the
 * widget only reads it. This is the opposite of the snapshot style, where the
 * value is copied into the menu item at build time and the caller must rebuild
 * the menu to show a new value.
 *
 * Two rules:
 *
 * - `get` must read live state. Do not close over a copy taken at `menu()`
 *   time; menu rows keep stable ids, so `invalidate` reuses the mounted widget
 *   and will not remount it.
 * - `subscribe` is only needed when a write somewhere else must move this row.
 *   A row that paints again after its own click does not need it.
 */
export type Pull<T> = {
  get: () => T;
  subscribe?: (onChange: () => void) => () => void;
};

/**
 * Tells listeners that something they pull from has changed.
 *
 * Use this when the state lives elsewhere (an editor, a store) and you only
 * need a change signal, not a value.
 */
export type Notifier = {
  notify: () => void;
  subscribe: (onChange: () => void) => () => void;
};

export function notifier(): Notifier {
  const listeners = new Set<() => void>();
  return {
    notify: () => {
      for (const listener of [...listeners]) {
        listener();
      }
    },
    subscribe: (onChange: () => void) => {
      listeners.add(onChange);
      return () => {
        listeners.delete(onChange);
      };
    }
  };
}

/**
 * A local value you can pull from. `set` notifies subscribers.
 *
 * Use a cell when more than one mounted widget shows the same value, or when a
 * test needs to move the value from outside. A plain closure
 * (`{ get: () => myVar }`) is enough for one row.
 */
export type Cell<T> = Required<Pull<T>> & { set: (value: T) => void };

export function cell<T>(initial: T): Cell<T> {
  let value = initial;
  const changes = notifier();
  return {
    get: () => value,
    set: (next: T) => {
      value = next;
      changes.notify();
    },
    subscribe: changes.subscribe
  };
}
