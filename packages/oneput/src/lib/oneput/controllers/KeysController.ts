import { tinykeys } from 'tinykeys';
import type { Controller } from './controller.js';
import type { KeyBinding, KeyBindingMap } from '../lib/bindings.js';

/**
 * Manages key bindings.
 *
 * Bindings declare when they apply via `when.menuOpen`:
 * - true = only when menu is open
 * - false = only when menu is closed
 * - undefined = always active
 */
export class KeysController {
  public static create(ctl: Controller) {
    return new KeysController(ctl);
  }

  constructor(
    private ctl: Controller,
    private unsubscribeGlobalKeys: () => void = () => {},
    private unsubscribeLocalKeys: () => void = () => {}
  ) {}

  private handleBinding(evt: KeyboardEvent, actionId: string, kb: KeyBinding) {
    evt.preventDefault();
    if (this.keysDisabled) {
      return;
    }
    const menuOpen = this.ctl.menu.isMenuOpen;
    const whenMenuOpen = kb.when?.menuOpen;
    if (whenMenuOpen === undefined || whenMenuOpen === menuOpen) {
      // MENU_OPEN_CLOSE_RACE
      setTimeout(() => {
        this.ctl.app.handleAction(actionId, kb.action);
      });
    }
  }

  /**
   * Split bindings by when.menuOpen and register with tinykeys.
   *
   * To scale this to more when-flags in future, we would register all bindings
   * in one call to tinykeys and dispatch the correct action based on system
   * state. If there are 2 different actions with the same binding and different
   * values for a when-flag, then we dispatch the one that matches. If 2
   * bindings have different flags that match the system state, then one of them
   * has to take precendence as we don't want 2 actions firing. We could use
   * specificity or we could detect overlap when bidings are being loaded and
   * error out or drop the overlapping ones. This means overlapping bindings
   * will need to specify all flags that overlap and decide who gets to handle a
   * particular combination of those flags.
   */
  private registerKeys(bindings: KeyBindingMap) {
    this.unsubscribeGlobalKeys();
    this.unsubscribeLocalKeys();

    const globalTinykeys: { [key: string]: (evt: KeyboardEvent) => void } = {};
    const localTinykeys: { [key: string]: (evt: KeyboardEvent) => void } = {};

    for (const [actionId, kb] of Object.entries(bindings)) {
      const menuOpen = kb.when?.menuOpen;
      for (const binding of kb.bindings) {
        const handler = (evt: KeyboardEvent) => {
          this.handleBinding(evt, actionId, kb);
        };
        // Register in appropriate handler(s) based on when.menuOpen
        if (menuOpen === undefined || menuOpen === false) {
          globalTinykeys[binding] = handler;
        }
        if (menuOpen === undefined || menuOpen === true) {
          localTinykeys[binding] = handler;
        }
      }
    }

    if (Object.keys(globalTinykeys).length > 0) {
      this.unsubscribeGlobalKeys = tinykeys(window, globalTinykeys);
    }
    if (Object.keys(localTinykeys).length > 0) {
      this.unsubscribeLocalKeys = tinykeys(document.body, localTinykeys);
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
   * If the current bindings are default, then they will be updated so you can use the new binding straight away.
   */
  setDefaultBindings(bindings: KeyBindingMap) {
    this.defaultBindings = bindings;
    if (this.isUsingDefaultBindings) {
      this.setBindings(bindings);
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

  setBindings(bindings: KeyBindingMap) {
    this.isUsingDefaultBindings = false;
    this.currentBindings = bindings;
    this.registerKeys(bindings);
    this.ctl.events.emit({ type: 'bindings-change', payload: { bindings } });
  }

  /**
   * Reset bindings to default values or nothing if no default values are set.
   */
  resetBindings() {
    this.setBindings(this.defaultBindings);
    this.isUsingDefaultBindings = true;
  }
}
