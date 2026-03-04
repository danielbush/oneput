import { tinykeys } from 'tinykeys';
import type { Controller } from './controller.js';
import type { KeyBinding, KeyBindingMap } from '../lib/bindings.js';

/**
 * Manages key bindings — registration, dispatch, and default/override lifecycle.
 *
 * Bindings declare when they apply via `when.menuOpen`:
 * - true = only when menu is open
 * - false = only when menu is closed
 * - undefined = always active
 *
 * Dispatch strategy: all bindings are registered on a single target (window)
 * via one tinykeys call. When the same key string is bound to multiple actions
 * under different `when` conditions, candidates are collected per key and
 * matchesWhen() selects the right one at dispatch time.
 *
 * To add more `when` flags in future, extend matchesWhen() and validate at
 * registration time that no two candidates for the same key have overlapping
 * conditions (so exactly one fires).
 *
 * Lifecycle: default bindings are always present. setBindings() merges
 * additional bindings on top of defaults (for AppObject actions).
 * replaceBindings() fully replaces all bindings and returns a restore
 * callback (for modals like Alert/Confirm that need exclusive control).
 * resetBindings() restores to just the defaults.
 */
export class KeysController {
  public static create(ctl: Controller) {
    return new KeysController(ctl);
  }

  constructor(
    private ctl: Controller,
    private unsubscribe: () => void = () => {}
  ) {}

  private matchesWhen(when?: { menuOpen?: boolean }): boolean {
    if (when?.menuOpen !== undefined && when.menuOpen !== this.ctl.menu.isMenuOpen) return false;
    return true;
  }

  private dispatch(evt: KeyboardEvent, candidates: Array<{ actionId: string; kb: KeyBinding }>) {
    if (this.keysDisabled) return;
    const match = candidates.find((c) => this.matchesWhen(c.kb.when));
    if (match) {
      evt.preventDefault();
      // MENU_OPEN_CLOSE_RACE
      setTimeout(() => {
        this.ctl.app.handleAction(match.actionId, match.kb.action);
      });
    }
  }

  private registerKeys(bindings: KeyBindingMap) {
    this.unsubscribe();

    // Group bindings by key string. A key like 'ArrowUp' may have multiple
    // candidates with different `when` conditions (e.g. one for menuOpen: true,
    // another for menuOpen: false). At dispatch time we pick the matching one.
    const candidatesByKey = new Map<string, Array<{ actionId: string; kb: KeyBinding }>>();
    for (const [actionId, kb] of Object.entries(bindings)) {
      for (const binding of kb.bindings) {
        if (!candidatesByKey.has(binding)) candidatesByKey.set(binding, []);
        candidatesByKey.get(binding)!.push({ actionId, kb });
      }
    }

    const handlers: Record<string, (evt: KeyboardEvent) => void> = {};
    for (const [key, candidates] of candidatesByKey) {
      handlers[key] = (evt: KeyboardEvent) => this.dispatch(evt, candidates);
    }

    if (Object.keys(handlers).length > 0) {
      this.unsubscribe = tinykeys(window, handlers);
    }
  }

  private keysDisabled = false;

  /**
   * Prefer ctl.ui.update({ flags: { enableKeys: true } }) instead.
   */
  _enableKeys(on: boolean = true) {
    this.keysDisabled = !on;
  }

  /**
   * Sets default bindings. Each binding declares when it applies via `when.menuOpen`.
   *
   * If currently using defaults, the change takes effect immediately.
   */
  setDefaultBindings(bindings: KeyBindingMap) {
    this.defaultBindings = bindings;
    if (this.isUsingDefaultBindings) {
      this.resetBindings();
    }
  }

  getDefaultBindings() {
    return this.defaultBindings;
  }

  getCurrentBindings() {
    return this.currentBindings;
  }

  private defaultBindings: KeyBindingMap = {};
  private currentBindings: KeyBindingMap = {};
  private isUsingDefaultBindings = true;

  /**
   * Merges the given bindings with the defaults. Use this for AppObject
   * actions that should coexist with default bindings (menu nav, etc.).
   *
   * Logs a warning if an action ID conflicts with a default binding.
   */
  setBindings(bindings: KeyBindingMap) {
    for (const actionId of Object.keys(bindings)) {
      if (actionId in this.defaultBindings) {
        console.warn(`ActionId "${actionId}" overrides an exisitng default actionId`);
      }
    }
    this.isUsingDefaultBindings = false;
    this.currentBindings = { ...this.defaultBindings, ...bindings };
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
    const savedIsUsingDefaults = this.isUsingDefaultBindings;
    this.isUsingDefaultBindings = false;
    this.currentBindings = bindings;
    this.registerKeys(this.currentBindings);
    this.ctl.events.emit({ type: 'bindings-change', payload: { bindings: this.currentBindings } });
    return () => {
      this.isUsingDefaultBindings = savedIsUsingDefaults;
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
    this.isUsingDefaultBindings = true;
    this.currentBindings = { ...this.defaultBindings };
    this.registerKeys(this.currentBindings);
    this.ctl.events.emit({ type: 'bindings-change', payload: { bindings: this.currentBindings } });
  }
}
