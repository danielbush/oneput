import type { Controller } from '../controller.js';
import type { FocusBehaviour, FilterFn } from '../../types.js';

/**
 * The FILTER channel — sync derivation of the displayed layer from the base:
 * `(query, base) => subset` (+highlight via derivedHTML).
 *
 * This is deliberately a separate module from {@link MenuItemsFnController}
 * (the generative channel) so the two menu kinds come in through different
 * doors. Because a filter is known to be sync and base-derivable, `invalidate()`
 * can re-apply it inline against a freshly re-seeded base in the same tick (see
 * {@link run}), so the user's query survives a base change with no flash.
 */
export class FilterController {
  public static create(ctl: Controller) {
    return new FilterController(ctl);
  }

  public static createNull(ctl: Controller) {
    return new FilterController(ctl);
  }

  private disabled = false;
  private filter?: FilterFn;
  private defaultFilter?: FilterFn;
  private focusBehaviour?: FocusBehaviour;
  private removeListener?: () => void;

  private constructor(private ctl: Controller) {}

  /**
   * Gate filter firing alongside menuItemsFn. Prefer
   * `ctl.ui.update({ flags: { enableMenuItemsFn: true } })`.
   */
  _enable(on: boolean = true) {
    this.disabled = !on;
  }

  /**
   * Register a sync filter `(query, base) => subset`. Fires on input-change
   * while the menu is open. Returning undefined leaves the displayed layer
   * untouched (same contract as a menuItemsFn).
   */
  set(filter: FilterFn, options: { focusBehaviour?: FocusBehaviour } = {}) {
    this.filter = filter;
    this.focusBehaviour = options.focusBehaviour;
    this.ensureListener();
  }

  /**
   * Set the filter restored per-AppObject by {@link reset} (called in runBefore).
   * Use at app setup (e.g. _layout) for the default filter every menu gets.
   */
  setDefault(filter: FilterFn, options: { focusBehaviour?: FocusBehaviour } = {}) {
    this.defaultFilter = filter;
    this.set(filter, options);
  }

  reset() {
    if (this.defaultFilter) {
      this.set(this.defaultFilter, { focusBehaviour: this.ctl.menu.defaultFocusBehaviour });
    } else {
      this.clear();
    }
  }

  clear() {
    this.filter = undefined;
  }

  /**
   * Run the active filter NOW against the current base + input, painting once.
   * Used by invalidate after re-seeding the base so the query survives; runs in
   * the same synchronous tick as the base paint, so there is no flash. No-op
   * (returns false) if no filter is active or the menu is closed.
   */
  run(opts?: { focusBehaviour?: FocusBehaviour }): boolean {
    if (this.disabled) {
      return false;
    }
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
    this.ctl.menu.setDisplayed({
      items,
      focusBehaviour: opts?.focusBehaviour ?? this.focusBehaviour
    });
    return true;
  }

  private ensureListener() {
    if (this.removeListener) {
      return;
    }
    this.removeListener = this.ctl.events.on('input-change', () => {
      this.run();
    });
  }
}
