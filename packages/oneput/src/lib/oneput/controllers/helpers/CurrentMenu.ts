import { isFocusable } from '../../lib/utils.js';
import type { MenuItemAny } from '../../../oneput/types.js';
import type { Controller } from '../controller.js';

/**
 * Calculates various things about the current menu.
 *
 * Does not make any changes to the menu.  Treat as a kind of value object.
 */
export class CurrentMenu {
  static createBlank(ctl: Controller) {
    return new CurrentMenu(ctl, '');
  }

  static create(ctl: Controller, menuId: string, menuItems: Array<MenuItemAny | undefined>) {
    return new CurrentMenu(ctl, menuId, menuItems);
  }

  public allMenuItems: Array<MenuItemAny> = [];

  constructor(
    private ctl: Controller,
    private _menuId: string,
    /**
     * Represents the current list of available menu items which is usually used
     * to set currentProps.menuItems.
     *
     * - setMenu updates this list.
     * - _setMenuonly updates currentProps.menuItems.
     * - menuItemsFn* and defaultMenuItemsFn only update currentProps.menuItems.
     *
     * For filtering, menuItemsFn* are passed all menuItems so they can filter on it.
     * For dynamic menu item generation, menuItems can be ignored.
     */
    _allMenuItems: Array<MenuItemAny | undefined> = []
  ) {
    this.allMenuItems = _allMenuItems.filter(Boolean) as Array<MenuItemAny>;
  }

  get focusedMenuItemIndex() {
    return this.ctl.currentProps.menuItemFocus?.[0] ?? 0;
  }

  get displayedMenuItemCount() {
    return this.ctl.currentProps.menuItems?.length ?? 0;
  }

  get focusedMenuItem() {
    return this.ctl.currentProps.menuItems?.[this.focusedMenuItemIndex];
  }

  get displayedMenuItems() {
    return this.ctl.currentProps.menuItems;
  }

  get menuId() {
    return this._menuId;
  }

  getSafeIndex(index: number) {
    return Math.max(0, Math.min(index, this.displayedMenuItemCount - 1));
  }

  getSafe(index: number) {
    const safeIndex = this.getSafeIndex(index);
    return { index: safeIndex, menuItem: this.ctl.currentProps.menuItems?.[safeIndex] };
  }

  nextMenuItemIndex(index?: number) {
    index = index ?? this.focusedMenuItemIndex;
    return (index + 1 + this.displayedMenuItemCount) % Math.max(1, this.displayedMenuItemCount);
  }

  previousMenuItemIndex(index?: number) {
    index = index ?? this.focusedMenuItemIndex;
    return (index - 1 + this.displayedMenuItemCount) % Math.max(1, this.displayedMenuItemCount);
  }

  getFocusable(index: number) {
    const item = this.ctl.currentProps.menuItems?.[index];
    if (isFocusable(item)) {
      return item;
    }
    return null;
  }

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
