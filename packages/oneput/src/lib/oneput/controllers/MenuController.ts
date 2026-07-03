import type { FocusBehaviour, MenuItem, MenuItemAny, MenuItemsGenFnAsync } from '../types.js';
import type { FilterFn } from '../types.js';
import type { Controller } from './controller.js';
import { CurrentMenu } from './helpers/CurrentMenu.js';
import { GenerativeMenuManager } from './helpers/GenerativeMenuManager.js';
import { FilterManager } from './helpers/FilterManager.js';
import { stdSkeletonMenuItems } from '../shared/ui/menuItems/stdSkeletonMenuItems.js';

type MenuInputMode = 'none' | 'filter' | 'generative';

/**
 * `filter` and `generative` modes are mutually exclusive.
 *
 * If we are in generative mode, typing triggers fetching data (or some async
 * process), and it should therefore not act as a filter on the current menu
 * items.
 */
type MenuInputChannelState = {
  /**
   * The current input mode: filter, generative or none.
   */
  mode: MenuInputMode;
  /**
   * Can be used to disable filtering (when mode is set to filter).
   */
  filterEnabled: boolean;
  /**
   * Can be used to disable generative menu items (when mode is set to generative).
   */
  generativeEnabled: boolean;
};

export class MenuController {
  public static create(ctl: Controller) {
    const fn = GenerativeMenuManager.create(ctl);
    const filter = FilterManager.create();
    return new MenuController(ctl, fn, filter);
  }

  public static createNull(ctl: Controller) {
    const fn = GenerativeMenuManager.createNull(ctl);
    const filter = FilterManager.createNull();
    return new MenuController(ctl, fn, filter);
  }

  constructor(
    private ctl: Controller,
    private generative: GenerativeMenuManager,
    private filter: FilterManager,
    private currentMenu = CurrentMenu.createBlank(ctl),
    private disableActions = false,
    private disableOpenClose = false,
    private inputChannel: MenuInputChannelState = {
      mode: 'none',
      filterEnabled: true,
      generativeEnabled: true
    },
    /**
     * Baseline focus behaviour restored when AppController switches AppObjects.
     *
     * Never used directly.
     */
    public defaultFocusBehaviour: FocusBehaviour = 'last-action,first',
    /**
     * Ambient focus behaviour used when a menu does not provide its own
     * focusBehaviour. It defaults to and is reset to defaultFocusBehaviour.
     *
     * Levels:
     *
     * - (1) defaultFocusBehaviour - Baseline across AppObjects.
     * - (2) ambient focusBehaviour - Current controller setting for redisplays.
     * - (3) Menu.focusBehaviour - Per-menu behavior when replacing the menu.
     * - (4) operation override - A one-shot override passed to a specific refresh operation, like:
     *   - the only way this happens currently is via invalidate; not sure it's even useful.
     */
    private focusBehaviour: FocusBehaviour = defaultFocusBehaviour
  ) {
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
      this.ctl.menu.setDisplayed();
    });
  }

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
   * Re-pull declarative menu (if defined); for declarative and non-declarative it will re-run the filter.
   *
   * Call this whenever AppObject state that affects menu rendering changes.
   * Pass `focusBehaviour: 'none'` to avoid moving the focused index.
   */
  invalidate = (opts?: { focusBehaviour?: FocusBehaviour }): boolean => {
    if (!this.ctl.menu.isMenuOpen) {
      return false;
    }
    const menu = this.ctl.app.getMenu();
    if (menu) {
      this.ctl.menu.setMenuOnly(menu);
      this.ctl.menu.setDisplayed({ focusBehaviour: opts?.focusBehaviour });
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
    const result =
      this.inputChannel.mode === 'filter' && this.inputChannel.filterEnabled
        ? this.filter.run(this.currentMenu.allMenuItems, this.ctl.input.getInputValue())
        : false;
    if (result === false) {
      this.ctl.currentProps.menuItems = this.currentMenu.allMenuItems;
    } else if (result === undefined) {
      //
    } else {
      this.ctl.currentProps.menuItems = result.items;
      if (result.focusItemId && this.focusMenuItemById(result.focusItemId)) {
        return;
      }
    }
    this.runFocusBehaviour(opts?.focusBehaviour ?? this.currentMenu.focusBehaviour);
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
    this.setDisplayed();
  }

  /**
   * Show a skeleton placeholder menu.
   *
   * Assumes you are using `setMenu`.  If using declarative menu (.menu()) in your AppObject you can do:
   *
   * ```ts
   *
   *   menu() {
   *     if (this.isLoading) {
   *       return { id: 'loading', items: stdSkeletonMenuItems(count) }
   *     }
   *     ... render the real thing ...
   *   }
   * ```
   *
   * @param count number of placeholder rows (default 4)
   */
  setMenuLoading(count?: number) {
    this.setMenu({ id: 'loading', items: stdSkeletonMenuItems(count ?? 10) });
  }

  private setMenuOnly(params?: {
    id: string;
    focusBehaviour?: FocusBehaviour;
    items: Array<MenuItemAny | undefined | false | null | ''>;
  }) {
    this.currentMenu = params
      ? CurrentMenu.create(this.ctl, params)
      : CurrentMenu.createBlank(this.ctl);
    this.ctl.events.emit({ type: 'set-menu-items', payload: { menuId: this.currentMenu.menuId } });
  }

  // #endregion

  // #region menu filter

  /**
   * Register a sync filter `(query, base) => subset`.
   */
  setFilter(filter: FilterFn) {
    this.generative.clear();
    this.filter.set(filter);
    this.inputChannel.mode = 'filter';
  }

  /**
   * Set the filter restored per-AppObject by AppController reset.
   */
  setDefaultFilter(filter: FilterFn) {
    this.generative.clear();
    this.filter.setDefault(filter);
    this.inputChannel.mode = 'filter';
  }

  clearFilter() {
    this.filter.clear();
    if (this.inputChannel.mode === 'filter') {
      this.inputChannel.mode = 'none';
    }
  }

  resetFilter() {
    this.filter.reset();
    this.inputChannel.mode = this.filter.hasFilter ? 'filter' : 'none';
  }

  /**
   * Prefer ctl.ui.update({ flags: { enableFilter: true } }) instead.
   */
  _enableFilter(on: boolean = true) {
    this.inputChannel.filterEnabled = on;
  }

  // #endregion

  // #region generative menu items

  /**
   * Prefer ctl.ui.update({ flags: { enableGenerative: true } }) instead.
   */
  _enableGenerative(on: boolean = true) {
    this.inputChannel.generativeEnabled = on;
  }

  setGenerativeAsync(
    generateAsync: MenuItemsGenFnAsync,
    options: {
      onDebounce?: (isDebouncing: boolean) => void;
      debounceMS?: number;
      focusBehaviour?: FocusBehaviour;
      whenEmpty?: () => MenuItemAny[];
    } = {}
  ) {
    this.inputChannel.mode = 'generative';
    this.generative.setAsync(
      generateAsync,
      options,
      () => this.inputChannel.mode === 'generative' && this.inputChannel.generativeEnabled
    );
  }

  clearGenerative() {
    this.generative.clear();
    if (this.inputChannel.mode === 'generative') {
      this.inputChannel.mode = 'none';
    }
  }

  triggerGenerative() {
    if (this.inputChannel.mode === 'generative' && this.inputChannel.generativeEnabled) {
      this.generative.trigger();
    }
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
        const lastActionId = this.ctl.app.getLastMenuActionId(this.currentMenu.menuId);
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
