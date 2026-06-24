import debounce from 'debounce';
import type { Controller } from '../controller.js';
import type { FocusBehaviour, MenuItemAny, MenuItemsFn, MenuItemsFnAsync } from '../../types.js';

/**
 * This is like a subcontroller.
 */
export class MenuItemsFnController {
  public static create(ctl: Controller) {
    return new MenuItemsFnController(ctl);
  }

  public static createNull(ctl: Controller) {
    return new MenuItemsFnController(ctl);
  }

  private disableMenuItemsFn = false;
  private defaultMenuItemsFn?: MenuItemsFn;
  private removeMenuItemsListener?: () => void;

  private filter?: MenuItemsFn;
  private defaultFilter?: MenuItemsFn;
  private filterFocusBehaviour?: FocusBehaviour;
  private removeFilterListener?: () => void;

  constructor(private ctl: Controller) {}

  /**
   * Prefer ctl.ui.update({ flags: { enableMenuItemsFn: true } }) instead.
   */
  _enableMenuItemsFn(on: boolean = true) {
    this.disableMenuItemsFn = !on;
  }

  /**
   * Sets a default menuItemsFn - see setMenuItemsFn for more details.
   *
   * If set, this is always present.  It can be disabled and re-enabled using
   * disableAllMenuItemsFn / enableAllMenuItemsFn.  It can be replaced by a
   * different menuItemsFn using setMenuItemsFn and restored by calling
   * setMenuItemsFn with no arguments.
   */
  setDefaultMenuItemsFn(menuItemsFn: MenuItemsFn) {
    this.defaultMenuItemsFn = menuItemsFn;
  }

  resetMenuItemsFn() {
    if (this.defaultMenuItemsFn) {
      this.setMenuItemsFn(this.defaultMenuItemsFn, {
        focusBehaviour: this.ctl.menu.defaultFocusBehaviour
      });
    }
  }

  // #region filter (sync, base -> subset)

  /**
   * Register a sync FILTER: `(query, base) => subset` (+highlight via derivedHTML).
   *
   * A filter is the typed channel for the "filter" menu kind — unlike a generative
   * `menuItemsFn`, the system KNOWS a filter is base-derivable and sync, so
   * `invalidate()` can re-apply it inline against the freshly re-seeded base in the
   * same tick (no flash). Fires on input-change while the menu is open.
   *
   * Returning undefined leaves the displayed layer untouched (same contract as fns).
   */
  setFilter(filter: MenuItemsFn, options: { focusBehaviour?: FocusBehaviour } = {}) {
    this.filter = filter;
    this.filterFocusBehaviour = options.focusBehaviour;
    this.ensureFilterListener();
  }

  /**
   * Set the filter restored per-AppObject by resetFilter (called in runBefore).
   * Use this at app setup (e.g. _layout) for the default filter every menu gets.
   */
  setDefaultFilter(filter: MenuItemsFn, options: { focusBehaviour?: FocusBehaviour } = {}) {
    this.defaultFilter = filter;
    this.setFilter(filter, options);
  }

  resetFilter() {
    if (this.defaultFilter) {
      this.setFilter(this.defaultFilter, {
        focusBehaviour: this.ctl.menu.defaultFocusBehaviour
      });
    } else {
      this.clearFilter();
    }
  }

  clearFilter() {
    this.filter = undefined;
  }

  /**
   * Run the active filter NOW against the current base + input, painting once.
   * Used by invalidate after re-seeding the base so the user's query survives;
   * runs in the same synchronous tick as the base paint, so there is no flash.
   * No-op (returns false) if no filter is active or the menu is closed.
   */
  runFilter(opts?: { focusBehaviour?: FocusBehaviour }): boolean {
    if (!this.filter) {
      return false;
    }
    if (!this.ctl.menu.isMenuOpen) {
      return false;
    }
    const items = this.filter(
      this.ctl.input.getInputValue(),
      this.ctl.menu.currentMenu.allMenuItems
    );
    if (!items) {
      return false;
    }
    this.ctl.menu._setMenu({
      items,
      focusBehaviour: opts?.focusBehaviour ?? this.filterFocusBehaviour
    });
    return true;
  }

  private ensureFilterListener() {
    if (this.removeFilterListener) {
      return;
    }
    this.removeFilterListener = this.ctl.events.on('input-change', ({ value }) => {
      if (this.disableMenuItemsFn) {
        return;
      }
      if (!this.ctl.menu.isMenuOpen) {
        return;
      }
      if (!this.filter) {
        return;
      }
      const items = this.filter(value, this.ctl.menu.currentMenu.allMenuItems);
      if (!items) {
        return;
      }
      this.ctl.menu._setMenu({ items, focusBehaviour: this.filterFocusBehaviour });
    });
  }

  // #endregion

  /**
   * Set a function that will be triggered on input change.
   *
   * If this function returns undefined, the menu will not be updated.
   */
  setMenuItemsFn(menuItemsFn: MenuItemsFn, options: { focusBehaviour?: FocusBehaviour } = {}) {
    this.removeMenuItemsListener?.();
    this.removeMenuItemsListener = this.ctl.events.on('input-change', ({ value }) => {
      if (this.disableMenuItemsFn) {
        return;
      }
      if (!this.ctl.menu.isMenuOpen) {
        return;
      }
      const items = menuItemsFn(value, this.ctl.menu.currentMenu.allMenuItems);
      if (!items) {
        return;
      }
      this.ctl.menu._setMenu({ items, focusBehaviour: options.focusBehaviour });
    });
  }

  /**
   * Calls to menuItemsFnAsync are debounced reducing calls to the function as
   * the user types.  If an older call comes in AFTER a later call it will be
   * discarded.
   */
  setMenuItemsFnAsync(
    menuItemsFnAsync: MenuItemsFnAsync,
    options: { onDebounce?: (isDebouncing: boolean) => void; focusBehaviour?: FocusBehaviour } = {}
  ) {
    this.removeMenuItemsListener?.();
    let inFlight = 0;
    const debouncedHandler = debounce(
      async ({ value }: { value: string }) => {
        inFlight = (inFlight + 1) % 100000;
        const thisInFlight = inFlight;
        let items: MenuItemAny[] | undefined;
        try {
          items = await menuItemsFnAsync(value, this.ctl.menu.currentMenu.allMenuItems);
        } catch (err) {
          console.error(
            'menuItemsFnAsync rejected - we recommend you catch your errors.  Error:',
            err
          );
        }
        if (thisInFlight === inFlight) {
          // No new call has come in during the await...
          options.onDebounce?.(false);
        } else {
          // Another call was triggered...
          // We discard to avoid out of sequence.
          // An older call may come in later than a newer call.
          // The older call's thisInFlight will be out of date.
          // console.warn(`DISCARDED ${value}...`);
          return;
        }
        if (!items) {
          return;
        }
        // console.warn(`got ${value}...`);
        this.ctl.menu._setMenu({ items, focusBehaviour: options.focusBehaviour });
      },
      500,
      { immediate: false }
    );
    this.removeMenuItemsListener = this.ctl.events.on('input-change', (payload) => {
      if (this.disableMenuItemsFn) {
        return;
      }
      if (!this.ctl.menu.isMenuOpen) {
        return;
      }
      options.onDebounce?.(true);
      debouncedHandler(payload);
    });
  }

  /**
   * Clear any non-default menu items fn.
   */
  clearMenuItemsFn() {
    this.removeMenuItemsListener?.();
  }

  triggerMenuItemsFn() {
    this.ctl.input.triggerInputEvent();
  }
}
