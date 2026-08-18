import type { FlexParams, FocusBehaviour, MenuItemAny, MenuItemsGenFnAsync } from '../types.js';
import type { MenuItemsFilterFn } from '../types.js';
import type { Controller } from './controller.js';
import { coalesce } from './helpers/coalesce.js';
import { CurrentMenu } from './helpers/CurrentMenu.js';
import { GenerativeMenuManager } from './helpers/GenerativeMenuManager.js';
import { FilterManager } from './helpers/FilterManager.js';
import { PointerFocusGuard } from './helpers/PointerFocusGuard.js';
import { stdSkeletonMenuItems } from '../shared/ui/menuItems/stdSkeletonMenuItems.js';
import { tick } from 'svelte';

type MenuInputMode = 'none' | 'filter' | 'generative';
type InvalidateOptions = { focusBehaviour?: FocusBehaviour };

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
    return new MenuController(ctl, fn, filter, true);
  }

  public static createNull(ctl: Controller) {
    const fn = GenerativeMenuManager.createNull(ctl);
    const filter = FilterManager.createNull();
    return new MenuController(ctl, fn, filter, false);
  }

  constructor(
    private ctl: Controller,
    private generative: GenerativeMenuManager,
    private filter: FilterManager,
    /**
     * When true, {@link completeMenuOutro} waits for Svelte `onoutroend`.
     *
     * `createNull` has no view, so it completes the outro in the close timeout.
     */
    private readonly viewOwnsOutro = false,
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
    // A click acts on the item under the pointer, not on the focused item.
    // Menu item focus can be off (`enableMenuItemFocus: false`), and a click
    // must still work. See ENTER_SEMANTICS in `docs/CONCEPTS.md`.
    this.ctl.currentProps.onMenuAction = (_evt, menuItem) => {
      this.runMenuItemAction(menuItem);
    };
    this.ctl.currentProps.onPointerMove = (evt) => {
      this.pointerFocusGuard.onPointerMove(evt);
    };
    this.ctl.currentProps.onMenuItemEnter = (evt, item, index) => {
      if (!this.enableMenuItemFocus) {
        return;
      }
      const pointer = evt as PointerEvent;
      if (this.pointerFocusGuard.shouldIgnoreEnter(pointer)) {
        return;
      }
      this.pointerFocusGuard.acceptEnter(pointer);
      this.ctl.currentProps.menuItemFocus = [index, false];
      this.ctl.events.emit({ type: 'menu-item-focus', payload: { index, menuItem: item } });
    };
    this.ctl.currentProps.onMenuOutroEnd = () => {
      this.completeMenuOutro();
    };
    this.ctl.events.on('input-change', () => {
      if (this.inputChannel.mode === 'filter' && !this.inputChannel.filterEnabled) {
        return;
      }
      this.ctl.menu.setDisplayed();
    });
    // Seeded from currentProps.menuOpen so createNull({ menuOpen: true }) can
    // setDisplayed without an explicit openMenu(). openMenu/closeMenu still
    // flip this ahead of the async menuOpen prop (FLASH_OF_NEXT_MENU).
    this.isMenuOpenImmediate = Boolean(this.ctl.currentProps.menuOpen);
  }

  // #region menu open/close

  get isMenuOpen() {
    return this.ctl.currentProps.menuOpen;
  }

  /**
   * Covers MENU_OPEN_CLOSE_RACE .
   *
   * menuOpen flips in a setTimeout. isMenuOpenImmediate flips now, so openMenu
   * / closeMenu stay idempotent before that timeout. Without it, two quick
   * openMenu calls would schedule two opens.
   *
   * Was originally created for FLASH_OF_NEXT_MENU but this is handed by QUEUE_POP_ON_OUTRO.
   */
  private isMenuOpenImmediate = false;
  private outroPending = false;

  /**
   * True from {@link closeMenu} until {@link completeMenuOutro}.
   *
   * `exit()` uses this to delay pop until the close animation has finished.
   */
  get isOutroPending() {
    return this.outroPending;
  }

  openMenu = () => {
    if (this.outroPending) {
      this.completeMenuOutro();
    }
    if (this.disableOpenClose || this.isMenuOpenImmediate) {
      return;
    }
    this.isMenuOpenImmediate = true;
    // MENU_OPEN_CLOSE_RACE
    setTimeout(() => {
      this.ctl.currentProps.menuOpen = true;
      // Refresh before the open event so stale closed-menu rows cannot become visible.
      void this.invalidateNow({});
      this.ctl.events.emit({ type: 'menu-open-change', payload: true });
    });
  };

  closeMenu = () => {
    if (this.disableOpenClose || !this.isMenuOpenImmediate) {
      return;
    }
    this.isMenuOpenImmediate = false;
    this.outroPending = true;
    // MENU_OPEN_CLOSE_RACE
    setTimeout(() => {
      this.ctl.currentProps.menuOpen = false;
      this.ctl.events.emit({ type: 'menu-open-change', payload: false });
      if (!this.viewOwnsOutro) {
        this.completeMenuOutro();
      }
    });
  };

  /**
   * Finish a pending menu close.
   *
   * The view calls this from Svelte `onoutroend`. `createNull` calls it in the
   * close timeout because there is no animation.
   */
  completeMenuOutro = () => {
    if (!this.outroPending) {
      return;
    }
    this.outroPending = false;
    this.ctl.events.emit({ type: 'menu-outro-end', payload: undefined });
  };

  // #endregion

  // #region menu items

  /**
   * Run the action of the focused menu item.
   *
   * Returns false when nothing ran — actions are disabled, or no item has the
   * focus (e.g. `enableMenuItemFocus: false`). A key binding that returns this
   * value leaves the browser default alone. See ENTER_SEMANTICS in
   * `docs/CONCEPTS.md`.
   */
  doMenuAction(): boolean {
    return this.runMenuItemAction(this.currentMenu.focusedMenuItem);
  }

  /**
   * Run one menu item's action. Returns false when nothing ran.
   */
  private runMenuItemAction(menuItem?: MenuItemAny): boolean {
    if (this.disableActions) {
      return false;
    }
    if (menuItem && !menuItem.ignored && menuItem.action) {
      this.ctl.app.handleMenuAction(menuItem, this.currentMenu.menuId);
      return true;
    }
    return false;
  }

  get displayedMenuItemCount() {
    return this.currentMenu.displayedMenuItemCount;
  }

  /**
   * Re-pull declarative menu (if defined); for declarative and non-declarative it will re-run the filter.
   *
   * Call this whenever AppObject state that affects menu rendering changes.
   * Pass `focusBehaviour: 'none'` to avoid moving the focused index.
   *
   * Returns a promise that resolves after Svelte has flushed the DOM (same as
   * {@link InputController.setInputValue} / `tick()`), or `false` if the menu
   * was closed and nothing was updated. Await before reading layout (e.g. scroll).
   */
  private invalidateNow = async ({ focusBehaviour }: InvalidateOptions): Promise<boolean> => {
    if (!this.isMenuOpenImmediate || !this.ctl.menu.isMenuOpen) {
      return false;
    }
    const menu = this.ctl.app.getMenu();
    if (menu) {
      this.ctl.menu.setMenuOnly(menu);
      this.ctl.menu.setDisplayed({ focusBehaviour });
    } else {
      // menu undefined => AppObject not using .menu(), just re-display
      this.ctl.menu.setDisplayed({ focusBehaviour });
    }
    await tick();
    return true;
  };

  /**
   * See {@link coalesce}.
   */
  private invalidateCoalesced = coalesce<InvalidateOptions, boolean>(
    {
      merge: (current, next) => ({
        focusBehaviour: next.focusBehaviour ?? current.focusBehaviour
      }),
      onBatch: ({ requestCount, input }) => {
        console.debug(`Coalesced ${requestCount} menu invalidations`, input);
      }
    },
    this.invalidateNow
  );

  /** Rebuild the current menu and wait for Svelte to update its DOM. */
  invalidate = (opts: InvalidateOptions = {}): Promise<boolean> => {
    if (!this.ctl.menu.isMenuOpen) {
      return Promise.resolve(false);
    }
    return this.invalidateCoalesced(opts);
  };

  /**
   * Sets what will be displayed including re-running the filter.
   *
   * If the menu is closed you won't see the changes until it's opened.
   */
  private setDisplayed(opts?: { focusBehaviour?: FocusBehaviour }) {
    if (!this.isMenuOpenImmediate) {
      return;
    }
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
    header?: FlexParams;
    footer?: FlexParams;
  }) {
    this.setMenuOnly(params);
    this.setDisplayed();
  }

  /**
   * Show a skeleton placeholder menu.  Solves ASYNC_MENU_FLASH .
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
    header?: FlexParams;
    footer?: FlexParams;
  }) {
    this.currentMenu = params
      ? CurrentMenu.create(this.ctl, params)
      : CurrentMenu.createBlank(this.ctl);
    this.ctl.ui.setMenuUI({
      header: this.currentMenu.header,
      footer: this.currentMenu.footer
    });
    this.ctl.events.emit({ type: 'set-menu-items', payload: { menuId: this.currentMenu.menuId } });
  }

  // #endregion

  // #region menu filter

  /**
   * Register a sync filter `(query, base) => subset`.
   */
  setFilter(filter: MenuItemsFilterFn) {
    this.generative.clear();
    this.filter.set(filter);
    this.inputChannel.mode = 'filter';
  }

  /**
   * Set the filter restored per-AppObject by AppController reset.
   */
  setDefaultFilter(filter: MenuItemsFilterFn) {
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

  get enableFilter() {
    return this.inputChannel.filterEnabled;
  }

  // #endregion

  // #region generative menu items

  /**
   * Prefer ctl.ui.update({ flags: { enableGenerative: true } }) instead.
   */
  _enableGenerative(on: boolean = true) {
    this.inputChannel.generativeEnabled = on;
  }

  get enableGenerative() {
    return this.inputChannel.generativeEnabled;
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

  private menuItemFocusDisabled = false;
  private pointerFocusGuard = PointerFocusGuard.create();

  /**
   * Menu item focus is Oneput's own (synthetic) focus: a roving index that
   * `--focused` paints and that `DO_ACTION` acts on.
   *
   * Turn it off (`enableMenuItemFocus: false`) for a menu that is not a
   * keyboard chooser — e.g. a display with one incidental control, or a
   * textarea AppObject that wants `Enter` for newlines. Menu item actions still
   * run from a click, a dedicated binding, or native Tab focus. See
   * ENTER_SEMANTICS in `docs/CONCEPTS.md`.
   */
  get enableMenuItemFocus() {
    return !this.menuItemFocusDisabled;
  }

  /**
   * Prefer ctl.ui.update({ flags: { enableMenuItemFocus: false } }) instead.
   */
  _enableMenuItemFocus(on: boolean = true) {
    if (on === this.enableMenuItemFocus) {
      return;
    }
    this.menuItemFocusDisabled = !on;
    if (on) {
      this.runFocusBehaviour();
    } else {
      this.clearMenuItemFocus();
    }
  }

  /**
   * Take the focus off every item. Index -1 matches no item, thus no row shows
   * `--focused` and doMenuAction() finds nothing.
   */
  clearMenuItemFocus() {
    this.ctl.currentProps.menuItemFocus = [-1, false];
  }

  focusMenuItemByIndex(index: number, focus: boolean) {
    if (!this.enableMenuItemFocus) return;
    const { index: safeIndex, menuItem } = this.currentMenu.getSafe(index);
    this.setMenuItemFocus(safeIndex, menuItem, focus);
  }

  /**
   * Set synthetic focus. `scrollIntoView` is true for keyboard / programmatic
   * moves and arms the pointerenter guard.
   */
  private setMenuItemFocus(
    index: number,
    menuItem: MenuItemAny | undefined,
    scrollIntoView: boolean
  ) {
    if (scrollIntoView) {
      this.pointerFocusGuard.arm();
    }
    this.ctl.currentProps.menuItemFocus = [index, scrollIntoView];
    this.ctl.events.emit({
      type: 'menu-item-focus',
      payload: {
        index,
        menuItem
      }
    });
  }

  focusNextMenuItem(): boolean {
    if (!this.enableMenuItemFocus) return false;
    for (
      let i = this.currentMenu.nextMenuItemIndex(), c = 0;
      c < this.currentMenu.displayedMenuItemCount;
      c++, i = this.currentMenu.nextMenuItemIndex(i)
    ) {
      const menuItem = this.currentMenu.getFocusable(i);
      if (menuItem) {
        this.setMenuItemFocus(i, menuItem, true);
        return true;
      }
    }
    return false;
  }

  focusPreviousMenuItem(): boolean {
    if (!this.enableMenuItemFocus) return false;
    for (
      let i = this.currentMenu.previousMenuItemIndex(), c = 0;
      c < this.currentMenu.displayedMenuItemCount;
      c++, i = this.currentMenu.previousMenuItemIndex(i)
    ) {
      const menuItem = this.currentMenu.getFocusable(i);
      if (menuItem) {
        this.setMenuItemFocus(i, menuItem, true);
        return true;
      }
    }
    return false;
  }

  focusFirstMenuItem(): boolean {
    if (!this.enableMenuItemFocus) return false;
    for (let i = 0; i < this.currentMenu.displayedMenuItemCount; i++) {
      const menuItem = this.currentMenu.getFocusable(i);
      if (menuItem) {
        this.setMenuItemFocus(i, menuItem, true);
        return true;
      }
    }
    return false;
  }

  focusLastMenuItem(): boolean {
    if (!this.enableMenuItemFocus) return false;
    for (let i = this.currentMenu.displayedMenuItemCount - 1; i >= 0; i--) {
      const menuItem = this.currentMenu.getFocusable(i);
      if (menuItem) {
        this.setMenuItemFocus(i, menuItem, true);
        return true;
      }
    }
    return false;
  }

  focusMenuItemById(id: string) {
    if (!this.enableMenuItemFocus) return false;
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
    if (!this.enableMenuItemFocus) {
      this.clearMenuItemFocus();
      return;
    }
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
      case 'none': {
        // Don't reshuffle focus, but never leave it on an ignored/disabled row
        // (e.g. chat transcript above Back/Clear).
        if (!this.currentMenu.getFocusable(this.currentMenu.focusedMenuItemIndex)) {
          this.focusFirstMenuItem();
        }
        return;
      }
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

  get enableMenuActions() {
    return !this.disableActions;
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
}
