import { isFocusable } from '../../lib/utils.js';
import type { FocusBehaviour, MenuItemAny } from '../../../oneput/types.js';
import type { Controller } from '../controller.js';

/**
 * Wraps the current rendered menu.
 *
 * CurrentMenu keeps the stable menu id and source item list from the last
 * `setMenu` call, while its reactive accessors read the displayed menu state
 * from `ctl.currentProps`. Those reactive accessors can be used from Svelte
 * reactive contexts.
 *
 * Does not make any changes to the menu. Treat as a read-only view over the
 * current rendered menu.
 */
export class CurrentMenu {
  static createBlank(ctl: Controller) {
    return new CurrentMenu(ctl, '');
  }

  static create(ctl: Controller, params: CurrentMenuParams) {
    return new CurrentMenu(ctl, params.id, params.items, params.focusBehaviour);
  }

  /**
   * Represents the current list of available menu items.
   */
  public allMenuItems: Array<MenuItemAny> = [];

  constructor(
    private ctl: Controller,
    private _menuId: string,
    allMenuItems: Array<MenuItemAny | undefined | false | null | ''> = [],
    private _focusBehaviour?: FocusBehaviour
  ) {
    this.allMenuItems = allMenuItems.filter(Boolean) as Array<MenuItemAny>;
  }

  /**
   * Reactive: reads the focused item index from currentProps.
   */
  get focusedMenuItemIndex() {
    return this.ctl.currentProps.menuItemFocus?.[0] ?? 0;
  }

  /**
   * Reactive: reads the displayed menu list from currentProps.
   */
  get displayedMenuItemCount() {
    return this.ctl.currentProps.menuItems?.length ?? 0;
  }

  /**
   * Reactive: reads the focused item from currentProps.
   */
  get focusedMenuItem() {
    return this.ctl.currentProps.menuItems?.[this.focusedMenuItemIndex];
  }

  /**
   * Reactive: reads the displayed menu list from currentProps.
   */
  get displayedMenuItems() {
    return this.ctl.currentProps.menuItems;
  }

  /**
   * Static: reads the captured menu id.
   */
  get menuId() {
    return this._menuId;
  }

  /**
   * Static: the focus behaviour resolved when this menu was set.
   */
  get focusBehaviour() {
    return this._focusBehaviour;
  }

  /**
   * Reactive: clamps against the displayed menu count from currentProps.
   */
  getSafeIndex(index: number) {
    return Math.max(0, Math.min(index, this.displayedMenuItemCount - 1));
  }

  /**
   * Reactive: reads the displayed menu list from currentProps.
   */
  getSafe(index: number) {
    const safeIndex = this.getSafeIndex(index);
    return { index: safeIndex, menuItem: this.ctl.currentProps.menuItems?.[safeIndex] };
  }

  /**
   * Reactive when no index is provided: defaults from currentProps and wraps
   * against the displayed menu count.
   */
  nextMenuItemIndex(index?: number) {
    index = index ?? this.focusedMenuItemIndex;
    return (index + 1 + this.displayedMenuItemCount) % Math.max(1, this.displayedMenuItemCount);
  }

  /**
   * Reactive when no index is provided: defaults from currentProps and wraps
   * against the displayed menu count.
   */
  previousMenuItemIndex(index?: number) {
    index = index ?? this.focusedMenuItemIndex;
    return (index - 1 + this.displayedMenuItemCount) % Math.max(1, this.displayedMenuItemCount);
  }

  /**
   * Reactive: reads the displayed menu list from currentProps.
   */
  getFocusable(index: number) {
    const item = this.ctl.currentProps.menuItems?.[index];
    if (isFocusable(item)) {
      return item;
    }
    return null;
  }

  /**
   * Reactive: searches the displayed menu list from currentProps.
   */
  getIndexFromId(id: string) {
    const index = this.ctl.currentProps.menuItems?.findIndex((item) => {
      return item.id === id;
    });
    if (index !== undefined && index !== -1) {
      return index;
    }
    return null;
  }
}

export type CurrentMenuParams = {
  id: string;
  items: Array<MenuItemAny | undefined | false | null | ''>;
  focusBehaviour?: FocusBehaviour;
};
