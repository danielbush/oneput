import { tinykeys } from 'tinykeys';
import type { Controller } from './controller.js';
import {
  KeyEventBindings,
  type KeyEventBinding,
  type KeyBindingMap,
  type WhenCondition
} from '../lib/bindings.js';
import { isNativeActivation } from '../lib/nativeActivation.js';
import { OneputActionProvider } from '../shared/actions/OneputActionProvider.js';

/**
 * Manages key bindings — registration, dispatch, and default/override lifecycle.
 *
 * Bindings declare when they apply via `when` ({@link WhenCondition}).
 *
 * Dispatch strategy: all bindings are registered on a single target (window)
 * via one tinykeys call. When the same key string is bound to multiple actions
 * under different `when` conditions, candidates are collected per key and
 * matchesWhen() selects the right one at dispatch time.
 *
 * Because the target is window, a binding would also fire while a button has
 * the true (DOM) focus. isNativeActivation() prevents this: unmodified Enter /
 * Space on a control that the browser activates is left alone, unless
 * `enableNativeActivation: false` (capture screens).
 *
 * An action can also decline: it returns false when it could not act (e.g.
 * DO_ACTION with no focused menu item), thus dispatch skips preventDefault and
 * the browser does its usual work. This is why the action runs before
 * preventDefault. See ENTER_SEMANTICS in `docs/CONCEPTS.md`.
 *
 * To add more `when` flags in future, extend matchesWhen() and validate at
 * registration time that no two candidates for the same key have overlapping
 * conditions (so exactly one fires).
 *
 * Lifecycle: setDefaultBindings() stores and applies defaults (called at
 * startup and by BindingsEditor). setBindings() merges AppObject actions
 * on top of defaults. replaceBindings() fully replaces all bindings and
 * returns a restore callback (for modals). resetBindings() restores to
 * just the defaults.
 *
 * There are two layers. The app layer holds what setBindings() and
 * resetBindings() give. A modal layer, from replaceBindings(), hides it while
 * the modal is open. setBindings() during a modal changes only the app layer,
 * thus the modal keeps its keys, and the change applies when the modal closes.
 */
export class KeysController {
  public static create(ctl: Controller) {
    return new KeysController(ctl);
  }

  public static createNull(ctl: Controller) {
    return new KeysController(ctl);
  }

  constructor(
    private ctl: Controller,
    private defaultBindings: KeyBindingMap = OneputActionProvider.create(ctl).getBindings()
  ) {}

  /** The active bindings: the innermost modal layer's, or else the app layer's. */
  private currentBindings: KeyBindingMap = {};
  /** The defaults and the current AppObject's actions. */
  private appBindings: KeyBindingMap = {};
  /** The open modals' bindings, innermost last. */
  private modalLayers: { bindings: KeyBindingMap }[] = [];
  private unsubscribe: () => void = () => {};
  private keysDisabled = false;

  private matchesWhen(when?: WhenCondition): boolean {
    if (when?.menuOpen !== undefined && when.menuOpen !== this.ctl.menu.isMenuOpen) return false;
    return true;
  }

  private dispatch(
    evt: KeyboardEvent,
    candidates: Array<{ actionId: string; kb: KeyEventBinding }>
  ) {
    if (this.keysDisabled) return;
    // The browser activates the focused control (e.g. Tab to the submit button,
    // then Enter). Leave that key alone unless the AppObject captures everything.
    if (this.nativeActivationEnabled && isNativeActivation(evt)) return;
    const match = candidates.find((c) => this.matchesWhen(c.kb.when));
    if (match) {
      // MENU_OPEN_CLOSE_RACE
      // setTimeout(() => {

      // The action runs first so that it can decline: an action that returns
      // false did not handle the key, thus we leave the default alone (e.g.
      // DO_ACTION with no focused menu item lets a textarea write a newline).
      // A modal layer has the keys alone: its own action runs, never an
      // AppObject action with the same ID.
      const handled =
        this.modalLayers.length > 0
          ? match.kb.action?.(this.ctl, { source: 'keyboard', event: evt })
          : this.ctl.app.handleKeyAction(match.actionId, evt, match.kb.action);
      // });
      if (handled !== false && (match.kb.preventDefault ?? true)) {
        evt.preventDefault();
      }
    }
  }

  private registerKeys(bindings: KeyBindingMap) {
    this.unsubscribe();

    const keb = KeyEventBindings.create(bindings);
    const handlers: Record<string, (evt: KeyboardEvent) => void> = {};
    for (const [key, candidates] of keb.candidatesByKey) {
      handlers[key] = (evt: KeyboardEvent) => this.dispatch(evt, candidates);
    }

    if (Object.keys(handlers).length > 0) {
      this.unsubscribe = tinykeys(window, handlers);
    }
  }

  /**
   * Prefer ctl.ui.update({ flags: { enableKeys: true } }) instead.
   */
  _enableKeys(on: boolean = true) {
    this.keysDisabled = !on;
  }

  get enableKeys() {
    return !this.keysDisabled;
  }

  private nativeActivationEnabled = true;

  /**
   * Prefer ctl.ui.update({ flags: { enableNativeActivation: false } }) instead.
   *
   * Set it off for capture screens (e.g. BindingsEditor) that must see every
   * key, even while a button has the true (DOM) focus.
   */
  _enableNativeActivation(on: boolean = true) {
    this.nativeActivationEnabled = on;
  }

  get enableNativeActivation() {
    return this.nativeActivationEnabled;
  }

  /**
   * Stores default bindings and applies them immediately.
   *
   * Called at startup  and by BindingsEditor when the user edits bindings. Safe
   * to call while an AppObject is active only if that AppObject has no actions
   * (e.g. BindingsEditor itself).
   */
  setDefaultBindings(bindings: KeyBindingMap) {
    this.defaultBindings = bindings;
    this.resetBindings();
  }

  getDefaultBindings() {
    return this.defaultBindings;
  }

  getCurrentBindings() {
    return this.currentBindings;
  }

  /** Remove the window handlers registered by this controller. */
  destroy() {
    this.unsubscribe();
    this.unsubscribe = () => {};
    this.currentBindings = {};
    this.appBindings = {};
    this.modalLayers = [];
    this.lastEmitted = undefined;
  }

  /** The key of the bindings last sent with `bindings-change`. */
  private lastEmitted?: string;

  /**
   * Register the innermost modal layer, or the app layer when no modal is
   * open. The keys always register, so new action functions take effect.
   * `bindings-change` goes out only when what a user sees changes (see
   * {@link bindingsKey}): an AppObject sets its bindings again on each
   * refresh, and a listener that redraws on the event must not loop.
   */
  private applyBindings() {
    this.currentBindings =
      this.modalLayers[this.modalLayers.length - 1]?.bindings ?? this.appBindings;
    this.registerKeys(this.currentBindings);
    const key = bindingsKey(this.currentBindings);
    if (key === this.lastEmitted) return;
    this.lastEmitted = key;
    this.ctl.events.emit({ type: 'bindings-change', payload: { bindings: this.currentBindings } });
  }

  /** Set the app layer. While a modal is open, the modal keeps the keys. */
  private setAppBindings(bindings: KeyBindingMap) {
    this.appBindings = bindings;
    if (this.modalLayers.length === 0) this.applyBindings();
  }

  /**
   * Merges the given bindings with the defaults. Use this for AppObject
   * actions that should coexist with default bindings (menu nav, etc.).
   *
   * When an override uses the same key string as a default binding, the
   * override wins and the conflicting key is removed from the default for
   * the duration of this AppObject. Logs a warning for each conflict.
   * Defaults are fully restored on resetBindings().
   */
  setBindings(bindings: KeyBindingMap) {
    const overrides = KeyEventBindings.create(bindings);
    for (const c of overrides.actionConflicts) {
      const [firstActionId, ...otherActionIds] = c.actionIds;
      console.error(
        `Binding "${c.key}" on actions "${otherActionIds.join(
          '", "'
        )}" overrides non-default action "${firstActionId}"`
      );
    }
    const finalBindings = KeyEventBindings.create(this.defaultBindings).merge(overrides);
    // for (const c of finalBindings.conflicts) {
    //   console.warn(
    //     `Binding "${c.key}" on action "${c.overrideActionId}" overrides default action "${c.defaultActionId}"`
    //   );
    // }
    this.setAppBindings(finalBindings.keyBindingMap);
  }

  /**
   * Fully replaces all bindings (defaults are NOT included) with a modal
   * layer. Returns a callback that removes the layer: the next modal layer,
   * or else the current app layer, then has the keys.
   *
   * Use this for modals like Alert/Confirm that need exclusive control
   * over key handling.
   */
  replaceBindings(bindings: KeyBindingMap): () => void {
    const layer = { bindings };
    this.modalLayers.push(layer);
    this.applyBindings();
    return () => {
      this.modalLayers = this.modalLayers.filter((open) => open !== layer);
      this.applyBindings();
    };
  }

  /**
   * Reset bindings to default values or nothing if no default values are set.
   */
  resetBindings() {
    this.setAppBindings({ ...this.defaultBindings });
  }
}

/**
 * What a user sees of the bindings: each action's keys, `when` and
 * description, by sorted action ID. The action functions are left out:
 * they are new each time an AppObject sets its bindings.
 */
function bindingsKey(bindings: KeyBindingMap) {
  return JSON.stringify(
    Object.keys(bindings)
      .sort()
      .map((id) => {
        const { bindings: keys, when, description } = bindings[id];
        return [id, keys, when, description];
      })
  );
}
