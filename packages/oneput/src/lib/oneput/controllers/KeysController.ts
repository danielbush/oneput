import { tinykeys } from 'tinykeys';
import type { Controller } from './controller.js';
import {
  KeyEventBindings,
  type KeyEventBinding,
  type KeyBindingMap,
  type WhenCondition
} from '../lib/bindings.js';
import { isNativeActivation } from '../lib/nativeActivation.js';
import { OneputCatalog } from '../shared/actions/OneputCatalog.js';

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
    private defaultBindings: KeyBindingMap = OneputCatalog.create(ctl).getBindings()
  ) {}

  private currentBindings: KeyBindingMap = {};
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
      const handled = this.ctl.app.handleKeyAction(match.actionId, evt, match.kb.action);
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
    this.currentBindings = finalBindings.keyBindingMap;
    this.registerKeys(this.currentBindings);
    this.ctl.events.emit({ type: 'bindings-change', payload: { bindings: this.currentBindings } });
  }

  /**
   * Fully replaces all bindings (defaults are NOT included). Returns a
   * callback that restores the previous bindings.
   *
   * Use this for modals like Alert/Confirm that need exclusive control
   * over key handling.
   */
  replaceBindings(bindings: KeyBindingMap): () => void {
    const savedBindings = this.currentBindings;
    this.currentBindings = bindings;
    this.registerKeys(this.currentBindings);
    this.ctl.events.emit({ type: 'bindings-change', payload: { bindings: this.currentBindings } });
    return () => {
      this.currentBindings = savedBindings;
      this.registerKeys(this.currentBindings);
      this.ctl.events.emit({
        type: 'bindings-change',
        payload: { bindings: this.currentBindings }
      });
    };
  }

  /**
   * Reset bindings to default values or nothing if no default values are set.
   */
  resetBindings() {
    this.currentBindings = { ...this.defaultBindings };
    this.registerKeys(this.currentBindings);
    this.ctl.events.emit({ type: 'bindings-change', payload: { bindings: this.currentBindings } });
  }
}
