/**
 * Bindings system — maps keyboard shortcuts to actions.
 *
 * Each KeyBinding has a `when` condition (e.g. `{ menuOpen: true }`) that
 * controls when it fires. KeysController uses these to register bindings
 * with tinykeys and dispatch at runtime.
 *
 * Key types:
 * - KeyBinding — the full binding with action callback, used by KeysController
 * - ActionBinding — binding info without action, used by AppObject.actions
 * - KeyBindingMap — dictionary of actionId → KeyBinding
 *
 * Terminology (internal):
 * - bs = KeyBinding['bindings'] — tinykeys format strings
 * - ke = KeyEvent — internal representation for comparison
 * - KeyEventBindings — class for validating/editing bindings (add, remove, find duplicates)
 *
 * Two kinds of binding clash:
 * - **Duplicate**: same key within a single KeyEventBindings set (e.g. user
 *   tries to bind $mod+s twice). Caught by addBinding() — this is an error.
 * - **Conflict**: same key across two separate sets being merged
 *   (e.g. an AppObject action uses $mod+h which is also a default binding).
 *   Detected by KeyEventBindings.merge() — the override wins, a warning is
 *   logged, and the default is restored when the AppObject exits.
 */
import { Result, ok, err } from 'neverthrow';
import type { Controller } from '../controllers/controller.js';
import { isMacOS } from './utils.js';

export type DuplicateBindingError = { message: string; details: string };

/**
 * The primary representation of a key binding that is passed to the keys
 * controller usually in a KeyBindingMap.
 */
export type KeyBinding = {
  action?: (c: Controller) => void;
  description: string;
  /**
   * A list of bindings in tinykeys format.  Each binding represents one ore more key presses.
   *
   * Each binding is a string eg "control+y e e t".  The spaces separate keys,
   * the pluses separate modifiers.
   */
  bindings: string[];
  /**
   * Conditions for when the binding is active.
   * - menuOpen: true = only when menu is open, false = only when closed, undefined = always
   */
  when?: { menuOpen?: boolean };
};

/**
 * The binding information for actions defined on AppObject.
 * Same as KeyBinding but without the `action` callback.
 */
export type ActionBinding = {
  description: string;
  bindings: string[];
  when?: { menuOpen?: boolean };
};

/**
 * The primary way to add key bindings to system (via the keys controller).
 */
export type KeyBindingMap = {
  [actionId: string]: KeyBinding;
};

export type KeyBindingSerializable = {
  description: string;
  bindings: string[];
  when?: { menuOpen?: boolean };
  /**
   * If action is passed an its is js it will cause an exception in some stores.
   */
  action?: never;
};

export type KeyBindingMapSerializable = {
  [actionId: string]: KeyBindingSerializable;
};

/**
 * Captures certain fields from a browser KeyboardEvent.
 *
 * We use this to avoid holding references to actual KeyboardEvents as there may
 * be issues doing this.
 *
 * KeyEvent.key needs to handle 'm', 'M', 'KeyM'. For simplicty we don't try to
 * convert 'm' to 'M' or vice versa. Functions like `isEqualKe` will transform
 * .key to lower case when doing comparison. When we detect if a pressed key
 * matches a binding we rely on Tinykeys to handle variations in case.
 */
export type KeyEvent = {
  key: string;
  metaKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
  controlKey: boolean;
};

export type KeyEventBinding = {
  action?: (c: Controller) => void;
  description: string;
  /**
   *  A KeyBinding can be represented as a tinykeys string : "control+y e e t"
   *
   *  (1) there are 4 KeyEvent's separated by a space.
   *  (2) the first key event has modifiers separated by a plus.
   *  (3) A KeyBindingMap will have a list of bindings; each binding in the list is
   *  an alternative.  A list of alternative bindings would be represented as
   *  KeyEvent[][].
   */
  bindings: KeyEvent[][];
  when?: { menuOpen?: boolean };
};

export type KeyEventsMap = { [actionId: string]: KeyEventBinding };

// NOTE: kb = KeyBinding, bs = binding string, ke = KeyEvent
// a kb is a sequence of bs; a ke is converted to a bs.

function isEqualKe(keyEvent1: KeyEvent, keyEvent2: KeyEvent) {
  return (
    keyEvent1.key.toLowerCase() === keyEvent2.key.toLowerCase() &&
    keyEvent1.metaKey === keyEvent2.metaKey &&
    keyEvent1.shiftKey === keyEvent2.shiftKey &&
    keyEvent1.altKey === keyEvent2.altKey &&
    keyEvent1.controlKey === keyEvent2.controlKey
  );
}

function isEqual(binding1: KeyEvent[], binding2: KeyEvent[]) {
  return binding1.every((keyEvent, index) => isEqualKe(keyEvent, binding2[index]));
}

export function toDisplayString(k: KeyEvent): string {
  return `${k.controlKey ? '⌃' : ''}${k.metaKey ? '⌘' : ''}${k.shiftKey ? '⇧' : ''}${
    k.altKey ? '⌥' : ''
  }${k.key.toUpperCase()}`;
}

export function toKeyEvent(event: KeyboardEvent): KeyEvent {
  return {
    key: event.key,
    metaKey: event.metaKey,
    shiftKey: event.shiftKey,
    altKey: event.altKey,
    controlKey: event.ctrlKey
  };
}

/**
 * Takes a sequence of KeyEvents and generates tinykey binding string.
 *
 * The output is suitable for using by tinykeys and this format is also the one
 * that users will use when hand-coding key configs.  Internally though, we may
 * use a KeyEvents format so that we have a canonical representation that we can
 * compare easily.
 */
function keToBs(keyEvents: KeyEvent[], isMac: boolean): KeyBinding['bindings'][number] {
  return keyEvents
    .map((keyEvent) => {
      // $mod is always first; remaining modifiers follow in Alt, Shift, <other> order.
      // On macOS: $mod = Meta, explicit Control is separate.
      // On Linux/Windows: $mod = Control, explicit Meta is separate.
      const modifiers = isMac
        ? [
            keyEvent.metaKey ? '$mod' : '',
            keyEvent.altKey ? 'Alt' : '',
            keyEvent.shiftKey ? 'Shift' : '',
            keyEvent.controlKey ? 'Control' : ''
          ]
        : [
            keyEvent.controlKey ? '$mod' : '',
            keyEvent.altKey ? 'Alt' : '',
            keyEvent.shiftKey ? 'Shift' : '',
            keyEvent.metaKey ? 'Meta' : ''
          ];

      const modString = modifiers.filter(Boolean).join('+');
      return modString ? modString + '+' + keyEvent.key : keyEvent.key;
    })
    .join(' ');
}

/**
 * Turns any tinykeys key binding into a KeyEvent.
 *
 * $mod is treated differently on a mac to a windows/linux machine.
 *
 */
function bsToKe(binding: KeyBinding['bindings'][number], isMac: boolean): KeyEvent[] {
  const keys = binding.split(' ');
  return keys.map((key) => {
    const keyEvent: KeyEvent = {
      key: '',
      metaKey: false,
      shiftKey: false,
      altKey: false,
      controlKey: false
    };
    const parts = key.split('+');
    keyEvent.key = parts.pop() ?? '';
    const modifiers = parts.join('+');
    keyEvent.metaKey = modifiers.includes('Meta');
    keyEvent.shiftKey = modifiers.includes('Shift');
    keyEvent.altKey = modifiers.includes('Alt');
    keyEvent.controlKey = modifiers.includes('Control');
    if (modifiers.includes('$mod')) {
      if (isMac) {
        keyEvent.metaKey = true;
      } else {
        keyEvent.controlKey = true;
      }
    }
    return keyEvent;
  });
}

function keMapToKbMap(keyEventsMap: KeyEventsMap, isMac: boolean): KeyBindingMap {
  return Object.entries(keyEventsMap).reduce((acc, [actionId, keyEventBinding]) => {
    acc[actionId] = {
      action: keyEventBinding.action,
      description: keyEventBinding.description,
      bindings: keyEventBinding.bindings.map((ke) => keToBs(ke, isMac)),
      when: keyEventBinding.when
    };
    return acc;
  }, {} as KeyBindingMap);
}

function kbMaptoKeMap(keyBindingMap: KeyBindingMap, isMac: boolean): KeyEventsMap {
  return Object.entries(keyBindingMap).reduce((acc, [actionId, keyBinding]) => {
    acc[actionId] = {
      action: keyBinding.action,
      description: keyBinding.description,
      bindings: keyBinding.bindings.map((bs) => bsToKe(bs, isMac)),
      when: keyBinding.when
    };
    return acc;
  }, {} as KeyEventsMap);
}

function kbToSerializable(keyBinding: KeyBinding): KeyBindingSerializable {
  return {
    description: keyBinding.description,
    bindings: keyBinding.bindings,
    when: keyBinding.when,
    action: undefined as never
  };
}

function kbFromSerializable(
  kbSerializable: KeyBindingSerializable,
  action?: (c: Controller) => void
): KeyBinding {
  return {
    description: kbSerializable.description,
    bindings: kbSerializable.bindings,
    when: kbSerializable.when,
    action
  };
}

export type BindingKeyConflict = {
  defaultActionId: string;
  overrideActionId: string;
  key: string;
};

/**
 * Two `when` conditions overlap (can both be true at the same time).
 *
 * - Both undefined → always active, overlap
 * - One undefined → the "always" one matches whenever the specific one does
 * - Same menuOpen value → overlap
 * - menuOpen: true vs menuOpen: false → mutually exclusive, no overlap
 */
function whenOverlaps(a?: { menuOpen?: boolean }, b?: { menuOpen?: boolean }): boolean {
  if (a?.menuOpen === undefined || b?.menuOpen === undefined) return true;
  return a.menuOpen === b.menuOpen;
}

/**
 * Let's you edit / validate a set of key bindings.
 *
 * Internally we use KeyEvent's not KeyBinding since these are easier to compare.
 *
 * A KeyBindingMap can be split into:
 * - A serializable part (KeyBindingMapSerializable) — key strings, descriptions,
 *   and when conditions. This can be persisted (e.g. IndexedDB) so users can
 *   store their preferred key bindings.
 * - An action map (Record<string, (c: Controller) => void>) — the callbacks,
 *   which are reattached via fromSerializable().
 *
 * The bindings themselves use the tinykeys format, which is a convenient
 * human-readable way to define key bindings (e.g. "$mod+Shift+k", "Escape").
 */
export class KeyEventBindings {
  static create(keyBindingMap: KeyBindingMap, isMac: boolean = isMacOS()) {
    return new KeyEventBindings(keyBindingMap, isMac);
  }

  static fromSerializable(
    kbMapSerializable: KeyBindingMapSerializable,
    actionMap: Record<string, (c: Controller) => void>,
    isMac: boolean = isMacOS()
  ): KeyEventBindings {
    return KeyEventBindings.create(
      Object.entries(kbMapSerializable).reduce((acc, [actionId, kbSerializable]) => {
        acc[actionId] = kbFromSerializable(kbSerializable, actionMap[actionId]);
        return acc;
      }, {} as KeyBindingMap),
      isMac
    );
  }

  /**
   * Store bindings in a canonical KeyEvents format that we can easily compare against.
   */
  private keyEventsMap: KeyEventsMap;
  private isMac: boolean;

  /**
   * Conflicts detected by the last merge() call. Empty if this instance
   * was not produced by merge().
   */
  readonly conflicts: BindingKeyConflict[] = [];

  constructor(
    keyBindingMap: KeyBindingMap,
    isMac: boolean = isMacOS(),
    conflicts: BindingKeyConflict[] = []
  ) {
    this.isMac = isMac;
    this.keyEventsMap = kbMaptoKeMap(keyBindingMap, isMac);
    this.conflicts = conflicts;
  }

  toSerializable() {
    return Object.entries(this.keyBindingMap).reduce((acc, [actionId, keyBinding]) => {
      acc[actionId] = kbToSerializable(keyBinding);
      return acc;
    }, {} as KeyBindingMapSerializable);
  }

  /**
   * Add a binding to an existing action within this set.
   *
   * This checks for **duplicates** — the same key already bound to any action
   * in this same set (e.g. user tries to bind $mod+s when it's already taken).
   * This is an error because it's ambiguous which action should fire.
   *
   * For **conflicts** across two separate sets (e.g. AppObject vs defaults),
   * use merge() instead.
   */
  addBinding = (actionId: string, keyEvents: KeyEvent[]): Result<void, DuplicateBindingError> => {
    const existing = this.find(keyEvents);
    if (existing.length > 0) {
      return err({
        message: 'Binding already exists',
        details: `This binding is already in use by another action: ${existing.map((e) => e.description).join(', ')}.  Please choose a different binding.`
      });
    }
    this.keyEventsMap[actionId].bindings.push(keyEvents);
    return ok();
  };

  /**
   * Remove binding using binding string represention of KeyEvent's.
   */
  removeBinding(actionId: string, binding: string) {
    const keyBindingMap = this.keyBindingMap;
    const newBindings = {
      ...keyBindingMap,
      [actionId]: {
        ...keyBindingMap[actionId],
        bindings: keyBindingMap[actionId].bindings.filter((b) => b !== binding)
      }
    };
    this.keyEventsMap = kbMaptoKeMap(newBindings, this.isMac);
  }

  /**
   * Check if key presses have been used for another action already.
   */
  find(keyEvents: KeyEvent[]): KeyEventBinding[] {
    return Object.values(this.keyEventsMap).filter((keyEventBinding) =>
      keyEventBinding.bindings.some((binding) => isEqual(binding, keyEvents))
    );
  }

  /**
   * Merge overrides on top of this set (the defaults). Returns a new
   * KeyEventBindings with conflicts removed from defaults and all overrides
   * included. Access .conflicts on the result to see what was overridden.
   *
   * A conflict occurs when the same key sequence (compared canonically via
   * KeyEvent) appears in both sets with overlapping `when` conditions.
   * Mutually exclusive conditions (e.g. menuOpen: true vs false) are not
   * conflicts and both bindings are kept.
   */
  merge(overrides: KeyEventBindings): KeyEventBindings {
    const overrideKeMap = overrides.keyEventsMap;

    // Build a lookup: for each override binding (KeyEvent[]), store its actionId and when
    const overrideLookup: Array<{
      actionId: string;
      binding: KeyEvent[];
      when?: { menuOpen?: boolean };
    }> = [];
    for (const [actionId, keb] of Object.entries(overrideKeMap)) {
      for (const binding of keb.bindings) {
        overrideLookup.push({ actionId, binding, when: keb.when });
      }
    }

    const conflicts: BindingKeyConflict[] = [];
    const cleanedDefaultsKeMap: KeyEventsMap = {};

    for (const [actionId, keb] of Object.entries(this.keyEventsMap)) {
      const remaining = keb.bindings.filter((defaultBinding) => {
        const conflict = overrideLookup.find(
          (o) => isEqual(defaultBinding, o.binding) && whenOverlaps(keb.when, o.when)
        );
        if (conflict) {
          conflicts.push({
            defaultActionId: actionId,
            overrideActionId: conflict.actionId,
            key: keToBs(defaultBinding, this.isMac)
          });
          return false;
        }
        return true;
      });

      if (remaining.length > 0) {
        cleanedDefaultsKeMap[actionId] = { ...keb, bindings: remaining };
      }
    }

    // Build the merged KeyBindingMap from cleaned defaults + overrides
    const mergedKbMap = {
      ...keMapToKbMap(cleanedDefaultsKeMap, this.isMac),
      ...keMapToKbMap(overrideKeMap, this.isMac)
    };
    return new KeyEventBindings(mergedKbMap, this.isMac, conflicts);
  }

  /**
   * Groups bindings by tinykeys key string. Each key may have multiple
   * candidates with different `when` conditions (e.g. one for menuOpen: true,
   * another for menuOpen: false). Used by KeysController to register handlers.
   */
  get candidatesByKey(): Map<string, Array<{ actionId: string; kb: KeyEventBinding }>> {
    const result = new Map<string, Array<{ actionId: string; kb: KeyEventBinding }>>();
    for (const [actionId, keb] of Object.entries(this.keyEventsMap)) {
      for (const binding of keb.bindings) {
        const key = keToBs(binding, this.isMac);
        if (!result.has(key)) result.set(key, []);
        result.get(key)!.push({ actionId, kb: keb });
      }
    }
    return result;
  }

  /**
   * Convert the key events map back to a key binding map - this is the format
   * that is usually written by users in configs etc.
   */
  get keyBindingMap() {
    return keMapToKbMap(this.keyEventsMap, this.isMac);
  }
}
