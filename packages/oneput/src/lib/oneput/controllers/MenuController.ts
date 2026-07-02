import type { FocusBehaviour, MenuItem, MenuItemAny } from '../types.js';
import type { FilterFn } from '../types.js';
import type { Controller } from './controller.js';
import { CurrentMenu } from './helpers/CurrentMenu.js';
import { MenuItemsFnController } from './helpers/MenuItemsFn.js';
import { FilterController } from './helpers/Filter.js';

export class MenuController {
  public static create(ctl: Controller) {
    const fn = MenuItemsFnController.create(ctl);
    const filter = FilterController.create(ctl);
    return new MenuController(ctl, fn, filter);
  }

  public static createNull(ctl: Controller) {
    const fn = MenuItemsFnController.createNull(ctl);
    const filter = FilterController.createNull(ctl);
    return new MenuController(ctl, fn, filter);
  }

  private currentMenu: CurrentMenu;

  constructor(
    private ctl: Controller,
    public fn: MenuItemsFnController,
    private filter: FilterController
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
    this.ctl.events.on('input-change', () => {
      this.ctl.menu.setDisplayed({ focusBehaviour: this.focusBehaviour });
    });
  }

  /**
   * Disable ALL menuItemsFn calls.
   */
  private disableActions = false;
  private disableOpenClose = false;

  /**
   * Baseline focus behaviour restored when AppController switches AppObjects.
   */
  public defaultFocusBehaviour: FocusBehaviour = 'last-action,first';

  /**
   * Ambient focus behaviour for redisplays that do not pass a one-shot override.
   */
  private focusBehaviour: FocusBehaviour = this.defaultFocusBehaviour;

  // #region menu open/close

  get isMenuOpen() {
    return this.ctl.currentProps.menuOpen;
  }

  openMenu = () => {
    if (this.disableOpenClose) {
      return;
    }
    // MENU_OPEN_CLOSE_RACE
    setTimeout(() => {
      this.ctl.currentProps.menuOpen = true;
      this.ctl.events.emit({ type: 'menu-open-change', payload: true });
      // Pull-on-open: re-seed the declarative base (+ re-apply any filter) so the
      // menu reflects current AppObject state without needing an explicit
      // invalidate() for changes made while closed. Guarded no-op if no menu().
      // Runs after menuOpen=true so the filter's open-guard passes.
      this.invalidate();
    });
  };

  closeMenu = () => {
    if (this.disableOpenClose) {
      return;
    }
    // MENU_OPEN_CLOSE_RACE
    setTimeout(() => {
      this.ctl.currentProps.menuOpen = false;
      this.ctl.events.emit({ type: 'menu-open-change', payload: false });
    });
  };

  // #endregion

  // #region menu items

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

  get displayedMenuItemCount() {
    return this.currentMenu.displayedMenuItemCount;
  }

  /**
   * Re-pull declarative menu (if defined).
   *
   * Call this whenever AppObject state that affects menu rendering changes.
   * Pass `focusBehaviour: 'none'` to avoid moving the focused index.
   */
  invalidate = (opts?: { focusBehaviour?: FocusBehaviour }): boolean => {
    if (!this.ctl.menu.isMenuOpen) {
      return false;
    }
    const menu = this.ctl.app.pullMenu();
    if (menu) {
      this.ctl.menu.setMenu({ ...menu, focusBehaviour: opts?.focusBehaviour });
    } else {
      // menu undefined => AppObject not using .menu(), just re-display
      this.ctl.menu.setDisplayed({ focusBehaviour: opts?.focusBehaviour });
    }
    return true;
  };

  /**
   * Sets what will be displayed including re-running the filter.
   *
   * If the menu is closed you won't see the changes until it's opened.
   */
  private setDisplayed(opts?: { focusBehaviour?: FocusBehaviour }) {
    if (!this.isMenuOpen) {
      return;
    }
    // If a sync filter is active, re-derive against the current input so the
    // user's query survives. Runs in the same tick as the base paint above, so
    // the displayed layer is only assigned twice synchronously -> single render,
    // no flash of the unfiltered base.
    const items = this.filter.run(this.currentMenu.allMenuItems);
    if (items === false) {
      this.ctl.currentProps.menuItems = this.currentMenu.allMenuItems;
    } else if (items === undefined) {
      //
    } else {
      this.ctl.currentProps.menuItems = items;
    }
    this.runFocusBehaviour(opts?.focusBehaviour);
  }

  /**
   * Set the current menu and sets all items to be displayed.
   *
   * If called with no arguments, the menu will be cleared.
   */
  setMenu(params?: {
    id: string;
    focusBehaviour?: FocusBehaviour;
    items: Array<MenuItemAny | undefined | false | null | ''>;
  }) {
    this.setMenuOnly(params);
    this.setDisplayed({
      focusBehaviour: params?.focusBehaviour ?? this.focusBehaviour
    });
  }

  setMenuOnly(params?: { id: string; items: Array<MenuItemAny | undefined | false | null | ''> }) {
    this.currentMenu = params
      ? CurrentMenu.create(this.ctl, params.id, params.items)
      : CurrentMenu.createBlank(this.ctl);
    this.ctl.events.emit({ type: 'set-menu-items', payload: { menuId: this.currentMenu.menuId } });
  }

  // #endregion

  // #region menu filter

  /**
   * Register a sync filter `(query, base) => subset`.
   */
  setFilter(filter: FilterFn) {
    this.filter.set(filter);
  }

  /**
   * Set the filter restored per-AppObject by AppController reset.
   */
  setDefaultFilter(filter: FilterFn) {
    this.filter.setDefault(filter);
  }

  clearFilter() {
    this.filter.clear();
  }

  resetFilter() {
    this.filter.reset();
  }

  /**
   * Prefer ctl.ui.update({ flags: { enableFilter: true } }) instead.
   */
  _enableFilter(on: boolean = true) {
    this.filter._enable(on);
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
    if (index !== null) {
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
   * The single owner of the menu's disabled state: gates actions
   * (`disableActions`) AND drives the visual dim (`menuDisabled` prop → CSS), so
   * behaviour and appearance can't drift. Freezes the displayed menu in place
   * without re-rendering or re-mapping its items — used to hold the current menu
   * during a transition (e.g. loading the next screen).
   *
   * Reset to enabled when a new AppObject starts (AppController.reset).
   *
   * Prefer ctl.ui.update({ flags: { enableMenuActions: true } }) instead.
   */
  _enableMenuActions(on: boolean = true) {
    this.disableActions = !on;
    this.ctl.currentProps.menuDisabled = !on;
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
