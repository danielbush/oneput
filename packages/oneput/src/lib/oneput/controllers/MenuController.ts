import type { FocusBehaviour, MenuItem, MenuItemAny } from '../types.js';
import type { Controller } from './controller.js';
import { CurrentMenu } from './helpers/CurrentMenu.js';
import { MenuItemsFnController } from './helpers/MenuItemsFn.js';

export class MenuController {
  public static create(ctl: Controller) {
    const fn = MenuItemsFnController.create(ctl);
    return new MenuController(ctl, fn);
  }

  public currentMenu: CurrentMenu;

  constructor(
    private ctl: Controller,
    public fn: MenuItemsFnController
  ) {
    this.currentMenu = CurrentMenu.createBlank(this.ctl);
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
  private disableActions = false;
  private disableOpenClose = false;
  public defaultFocusBehaviour: FocusBehaviour = 'last-action,first';
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
    if (this.currentMenu.focusedMenuItem?.action) {
      // TODO: call this before calling the action.  If the action
      // runs a new appObject, we'll break the tracking logic in
      // AppController.
      this.ctl.events.emit({
        type: 'menu-action',
        payload: {
          menuId: this.currentMenu.menuId,
          menuActionId: this.currentMenu.focusedMenuItem.id
        }
      });
      this.currentMenu.focusedMenuItem.action(this.ctl);
    }
  }

  // #endregion

  // #region setting menu items

  _setMenuItems(params: { focusBehaviour?: FocusBehaviour; items: Array<MenuItemAny> }) {
    this.ctl.currentProps.menuItems = params.items;
    this.runFocusBehaviour(params.focusBehaviour);
  }

  setMenu(params: {
    id: string;
    focusBehaviour?: FocusBehaviour;
    items: Array<MenuItemAny | undefined>;
  }) {
    this.currentMenu = CurrentMenu.create(this.ctl, params.id, params.items);
    this._setMenuItems({
      focusBehaviour: params.focusBehaviour,
      items: this.currentMenu.allMenuItems
    });
    this.ctl.events.emit({ type: 'set-menu-items', payload: { menuId: params.id } });
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
