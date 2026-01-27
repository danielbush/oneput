import debounce from 'debounce';
import { isFocusable } from '../lib/utils.js';
import type { MenuItem, MenuItemAny } from '../types.js';
import type { Controller } from './controller.js';

export type MenuItemsFn = (
  input: string,
  items: MenuItemAny[]
) => Array<MenuItemAny> | undefined | void;
export type MenuItemsFnAsync = (
  input: string,
  items: MenuItemAny[]
) => Promise<Array<MenuItemAny> | undefined>;

/**
 * Focus behaviours decide which item to focus on when a menu is displayed.
 *
 * - Comma separated values means: try the first value first, then fall back to the next, etc.
 * - "last-action" = Try to focus on the last executed action item for a given menu
 *   - menus are identified by an id in setMenuItems
 *   - menu id's are scoped to the current appObject
 */
type FocusBehaviour = 'last-action,first' | 'first' | 'last' | 'none';

/**
 * Calculates various things about the current menu.
 *
 * Does not make any changes to the menu.  Treat as a kind of value object.
 */
class CurrentMenuVal {
  static create(ctl: Controller, menuId: string) {
    return new CurrentMenuVal(ctl, menuId);
  }

  constructor(
    private ctl: Controller,
    private _menuId: string
  ) {}

  /**
   * Represents the current list of available menu items which is usually used
   * to set currentProps.menuItems.
   *
   * - setMenuItems updates this list.
   * - _setMenuItems only updates currentProps.menuItems.
   * - menuItemsFn* and defaultMenuItemsFn only update currentProps.menuItems.
   *
   * For filtering, menuItemsFn* are passed all menuItems so they can filter on it.
   * For dynamic menu item generation, menuItems can be ignored.
   */
  allMenuItems: Array<MenuItemAny> = [];

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

  setNewMenu(menuId: string, menuItems: Array<MenuItemAny>) {
    this._menuId = menuId;
    this.allMenuItems = menuItems;
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

export class MenuController {
  public static create(ctl: Controller) {
    const currentMenu = CurrentMenuVal.create(ctl, '');
    return new MenuController(ctl, currentMenu);
  }

  constructor(
    private ctl: Controller,
    public currentMenu: CurrentMenuVal
  ) {
    this.ctl.currentProps.onMenuOpenChange = (menuOpen) => {
      if (menuOpen) {
        // Focusing input when menu opens seems like a sensible default.
        // We could have a setting to disable this if needed.
        this.ctl.input.focusInput();
      }
    };
    this.ctl.currentProps.onMenuAction = () => {
      if (this.disableActions) {
        return;
      }
      this.doMenuAction();
    };
    this.ctl.currentProps.onMenuItemEnter = (_, item, index) => {
      this.ctl.currentProps.menuItemFocus = [index, false];
      this.ctl.events.emit({ type: 'menu-item-focus', payload: { index, menuItem: item } });
    };
  }

  /**
   * Disable ALL menuItemsFn calls.
   */
  private disableMenuItemsFn = false;
  private disableActions = false;
  private disableOpenClose = false;
  private defaultMenuItemsFn?: MenuItemsFn;
  private removeMenuItemsListener?: () => void;
  private defaultFocusBehaviour: FocusBehaviour = 'last-action,first';
  private focusBehaviour: FocusBehaviour = this.defaultFocusBehaviour;

  // #region menu open/close + action

  get isMenuOpen() {
    return this.ctl.currentProps.menuOpen;
  }

  openMenu = () => {
    if (this.disableOpenClose) {
      return;
    }
    this.ctl.currentProps.menuOpen = true;
    this.ctl.events.emit({ type: 'menu-open-change', payload: true });
  };

  closeMenu = () => {
    if (this.disableOpenClose) {
      return;
    }
    this.ctl.currentProps.menuOpen = false;
    this.ctl.events.emit({ type: 'menu-open-change', payload: false });
  };

  doMenuAction() {
    if (this.disableActions) {
      return;
    }
    const current = this.currentMenu;
    if (current.focusedMenuItem?.action) {
      // TODO: call this before calling the action.  If the action
      // runs a new appObject, we'll break the tracking logic in
      // AppController.
      this.ctl.events.emit({
        type: 'menu-action',
        payload: { menuId: current.menuId, menuActionId: current.focusedMenuItem.id }
      });
      current.focusedMenuItem.action(this.ctl);
    }
  }

  // #endregion

  // #region setting menu items

  private _setMenuItems(params: { focusBehaviour?: FocusBehaviour; items: Array<MenuItemAny> }) {
    this.ctl.currentProps.menuItems = params.items;
    this.runFocusBehaviour(params.focusBehaviour);
  }

  setMenuItems(params: { id: string; focusBehaviour?: FocusBehaviour; items: Array<MenuItemAny> }) {
    this.currentMenu.setNewMenu(params.id, params.items);
    this._setMenuItems(params);
    this.ctl.events.emit({ type: 'set-menu-items', payload: { menuId: params.id } });
  }

  // #endregion

  // #region menuItemsFn

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
      this.setMenuItemsFn(this.defaultMenuItemsFn, { focusBehaviour: this.defaultFocusBehaviour });
    }
  }

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
      const items = menuItemsFn(value, this.currentMenu.allMenuItems);
      if (!items) {
        return;
      }
      this._setMenuItems({ items, focusBehaviour: options.focusBehaviour });
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
          items = await menuItemsFnAsync(value, this.currentMenu.allMenuItems);
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
        this._setMenuItems({ items, focusBehaviour: options.focusBehaviour });
      },
      500,
      { immediate: false }
    );
    this.removeMenuItemsListener = this.ctl.events.on('input-change', (payload) => {
      if (this.disableMenuItemsFn) {
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

  // #endregion

  // #region menu item focus

  focusMenuItemByIndex(index: number, focus: boolean) {
    const { index: safeIndex, menuItem } = this.currentMenu.getSafe(index);
    this.ctl.currentProps.menuItemFocus = [safeIndex, focus];
    this.ctl.events.emit({
      type: 'menu-item-focus',
      payload: {
        index: safeIndex,
        menuItem: menuItem
      }
    });
  }

  focusNextMenuItem() {
    for (
      let i = this.currentMenu.nextMenuItemIndex(), c = 0;
      c < this.currentMenu.displayedMenuItemCount;
      c++, i = this.currentMenu.nextMenuItemIndex(i)
    ) {
      const menuItem = this.currentMenu.getFocusable(i);
      if (menuItem) {
        this.ctl.currentProps.menuItemFocus = [i, true];
        this.ctl.events.emit({
          type: 'menu-item-focus',
          payload: { index: i, menuItem }
        });
        break;
      }
    }
  }

  focusPreviousMenuItem() {
    for (
      let i = this.currentMenu.previousMenuItemIndex(), c = 0;
      c < this.currentMenu.displayedMenuItemCount;
      c++, i = this.currentMenu.previousMenuItemIndex(i)
    ) {
      const menuItem = this.currentMenu.getFocusable(i);
      if (menuItem) {
        this.ctl.currentProps.menuItemFocus = [i, true];
        this.ctl.events.emit({
          type: 'menu-item-focus',
          payload: { index: i, menuItem }
        });
        break;
      }
    }
  }

  focusFirstMenuItem() {
    for (let i = 0; i < this.currentMenu.displayedMenuItemCount; i++) {
      const menuItem = this.currentMenu.getFocusable(i);
      if (menuItem) {
        this.ctl.currentProps.menuItemFocus = [i, true];
        this.ctl.events.emit({
          type: 'menu-item-focus',
          payload: { index: i, menuItem }
        });
        break;
      }
    }
  }

  focusLastMenuItem() {
    for (let i = this.currentMenu.displayedMenuItemCount - 1; i >= 0; i--) {
      const menuItem = this.currentMenu.getFocusable(i);
      if (menuItem) {
        this.ctl.currentProps.menuItemFocus = [i, true];
        this.ctl.events.emit({
          type: 'menu-item-focus',
          payload: { index: i, menuItem }
        });
        break;
      }
    }
  }

  focusMenuItemById(id: string) {
    const index = this.currentMenu.getIndexFromId(id);
    if (index) {
      this.focusMenuItemByIndex(index, true);
      return true;
    }
    return false;
  }

  setDefaultFocusBehaviour(behaviour: FocusBehaviour) {
    this.defaultFocusBehaviour = behaviour;
  }

  /**
   * The behaviour after menu items have been set and the index may or may not
   * have been invalidated.
   */
  setFocusBehaviour(behaviour: FocusBehaviour) {
    this.focusBehaviour = behaviour;
  }

  resetFocusBehaviour() {
    this.focusBehaviour = this.defaultFocusBehaviour;
  }

  private runFocusBehaviour(focusBehaviour?: FocusBehaviour) {
    const behaviour = focusBehaviour ?? this.focusBehaviour;
    switch (behaviour) {
      case 'last-action,first': {
        const { lastActionId } = this.ctl.app.getMenu(this.currentMenu.menuId);
        if (lastActionId) {
          if (this.focusMenuItemById(lastActionId)) {
            return;
          }
        }
        this.focusFirstMenuItem();
        return;
      }
      case 'first':
        this.focusFirstMenuItem();
        return;
      case 'last':
        this.focusLastMenuItem();
        return;
      case 'none':
        return;
    }
  }

  // #endregion

  // #region Disable/enable

  // We can disable/enable:
  // - menu actions
  // - menu open/close
  // - mennItemsFn

  /**
   * Prefer ctl.ui.update({ flags: { enableMenuActions: true } }) instead.
   */
  _enableMenuActions(on: boolean = true) {
    this.disableActions = !on;
  }

  /**
   * Prefer ctl.ui.update({ flags: { enableMenuOpenClose: true } }) instead.
   */
  _enableMenuOpenClose(on: boolean = true) {
    this.disableOpenClose = !on;
  }

  get enableMenuOpenClose() {
    return !this.disableOpenClose;
  }

  /**
   * Prefer ctl.ui.update({ flags: { enableMenuItemsFn: true } }) instead.
   */
  _enableMenuItemsFn(on: boolean = true) {
    this.disableMenuItemsFn = !on;
  }

  // #endregion

  private fillHandler?: (item: MenuItem | undefined) => void;
  private fillOnce?: typeof this.fillHandler;

  setFillHandler(fn: (item: MenuItem | undefined) => void) {
    this.fillHandler = fn;
    this.fillOnce = undefined;
  }

  // setFillHandlerOnce(fn: (input: string) => void) {
  // 	this.fillHandler = fn;
  // 	this.fillOnce = fn;
  // }

  runFillHandler() {
    const currHandler = this.fillHandler;
    this.fillHandler?.(this.currentMenu.focusedMenuItem);
    if (currHandler && this.fillOnce === currHandler) {
      this.fillHandler = undefined;
      this.fillOnce = undefined;
    }
  }

  resetFillHandler() {
    this.fillHandler = undefined;
    this.fillOnce = undefined;
  }
}
