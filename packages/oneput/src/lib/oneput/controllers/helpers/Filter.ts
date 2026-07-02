import type { Controller } from '../controller.js';
import type { FilterFn, MenuItemAny } from '../../types.js';

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
  set(filter: FilterFn) {
    this.filter = filter;
  }

  /**
   * Set the filter restored per-AppObject by {@link reset} (called in runBefore).
   * Use at app setup (e.g. _layout) for the default filter every menu gets.
   */
  setDefault(filter: FilterFn) {
    this.defaultFilter = filter;
    this.set(filter);
  }

  reset() {
    if (this.defaultFilter) {
      this.set(this.defaultFilter);
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
  run(items: MenuItemAny[]) {
    if (this.disabled) {
      return false;
    }
    const result = this.filter?.(this.ctl.input.getInputValue(), items);
    return result;
  }
}
