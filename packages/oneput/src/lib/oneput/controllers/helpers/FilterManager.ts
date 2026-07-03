import type { Controller } from '../controller.js';
import type { MenuItemsFilterFn, MenuItemAny } from '../../types.js';

/**
 * The FILTER channel — sync derivation of the displayed layer from the base:
 * `(query, base) => subset` (+highlight via derivedHTML).
 *
 * This is deliberately a separate module from {@link MenuItemsFnController}
 * (the generative channel) so the two menu kinds come in through different
 * doors. {@link MenuController} owns which channel is currently active. Because
 * a filter is known to be sync and base-derivable, `invalidate()` can re-apply
 * it inline against a freshly re-seeded base in the same tick (see {@link run}),
 * so the user's query survives a base change with no flash.
 */
export class FilterManager {
  public static create() {
    return new FilterManager();
  }

  public static createNull() {
    return new FilterManager();
  }

  private filter?: MenuItemsFilterFn;
  private defaultFilter?: MenuItemsFilterFn;

  private constructor() {}

  /**
   * Register a sync filter `(query, base) => subset`. Fires on input-change
   * while the menu is open. Returning undefined leaves the displayed layer
   * untouched (same contract as a menuItemsFn).
   */
  set(filter: MenuItemsFilterFn) {
    this.filter = filter;
  }

  /**
   * Set the filter restored per-AppObject by {@link reset} (called in runBefore).
   * Use at app setup (e.g. _layout) for the default filter every menu gets.
   */
  setDefault(filter: MenuItemsFilterFn) {
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
   * Explicit non-default filter has been set.
   *
   * Not the same as "default filter exists".
   *
   */
  get hasFilter() {
    return Boolean(this.filter);
  }

  /**
   * Run the stored filter NOW against the current base + input, painting once.
   * Used by invalidate after re-seeding the base so the query survives; runs in
   * the same synchronous tick as the base paint, so there is no flash. The
   * caller owns whether the filter channel is active for this display.
   */
  run(items: MenuItemAny[], inputValue: string) {
    const result = this.filter?.(inputValue, items);
    return result;
  }
}
