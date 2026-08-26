import type { Controller } from './controller.js';
import type {
  AppActions,
  AppActionHandler,
  AppEvent,
  AppLayoutParams,
  MenuItem,
  AppObject,
  UIFlags,
  UILayout
} from '../types.js';
import type { KeyBindingMap } from '../lib/bindings.js';

export type AppChange = {
  previous: AppObject | null;
  current: AppObject | null;
};

export type AppChangeTracker = {
  data: AppChange[];
  stop: () => void;
};

type AnyAppObject = AppObject<any, any>;

type AppObjectState = {
  lastMenuActionIds: Record<string, string>;
  layout?: UILayout;
  layoutParams?: Partial<AppLayoutParams>;
};

/**
 * Manages AppObject's . One AppObject controls Oneput at a time.
 */
export class AppController {
  public static create(ctl: Controller) {
    return new AppController(ctl);
  }

  public static createNull(ctl: Controller) {
    return new AppController(ctl);
  }

  constructor(private ctl: Controller) {
    this.ctl.events.on('menu-outro-end', this.flushPendingPop);
  }

  private appParents: AnyAppObject[] = [];
  private appStates = new WeakMap<AnyAppObject, AppObjectState>();
  private current?: AnyAppObject;
  private onBack?: () => void;
  private unsubscribeMenuItemFocus?: () => void;
  private unsubscribeMenuUpdate?: () => void;
  private unsubscribeInputChange?: () => void;
  private unsubscribeMenuOpenChange?: () => void;
  private unsubscribeMenuOpenFocus?: () => void;
  private pendingPop?: { payload: unknown };

  // UI settings
  private disableGoBack = false;
  /**
   * Modal-tied flags captured on the first `enableModal: true`, restored on
   * `enableModal: false`. Prevents Confirm/Alert/BindingsEditor from wiping
   * AppObject settings like `enableFilter: false`.
   */
  private flagsBeforeModal?: UIFlags;
  private focusInputOnStart = true;
  private focusInputOnMenuOpen = true;
  private clearInputAfterAction = true;
  private clearInputAfterBack = true;

  private getAppState(app: AnyAppObject) {
    let state = this.appStates.get(app);
    if (!state) {
      state = { lastMenuActionIds: {} };
      this.appStates.set(app, state);
    }
    return state;
  }

  /**
   * Declaration = Object containing layout + params.
   *
   * - layout + params       => create/set active layout, then configure it
   * - no layout + params    => inherit active parent layout, then configure it
   * - no layout + no params => inherit active parent layout unchanged
   *
   */
  private resolveLayout(app: AnyAppObject, inheritedLayout?: UILayout) {
    const declaration = app.layout;
    if (!declaration) {
      return { layout: inheritedLayout, layoutParams: undefined };
    }
    return {
      layout: declaration.layout
        ? declaration.layout(this.ctl, declaration.params)
        : inheritedLayout,
      layoutParams: declaration.params
    };
  }

  // #region ui settings

  get flags(): UIFlags {
    return {
      enableGoBack: !this.disableGoBack,
      enableMenuOpenClose: this.ctl.menu.enableMenuOpenClose,
      enableKeys: this.ctl.keys.enableKeys,
      enableMenuActions: this.ctl.menu.enableMenuActions,
      enableGenerative: this.ctl.menu.enableGenerative,
      enableFilter: this.ctl.menu.enableFilter,
      enableInputElement: this.ctl.input.enableInputElement
    };
  }

  /**
   * Flags that should be turned off when modal is present.
   */
  private applyModalFlags(flags: {
    enableGoBack: boolean;
    enableMenuOpenClose: boolean;
    enableKeys: boolean;
    enableMenuActions: boolean;
    enableGenerative: boolean;
    enableFilter: boolean;
    enableInputElement: boolean;
  }) {
    this.ctl.app._enableGoBack(flags.enableGoBack);
    this.ctl.menu._enableMenuOpenClose(flags.enableMenuOpenClose);
    this.ctl.keys._enableKeys(flags.enableKeys);
    this.ctl.menu._enableMenuActions(flags.enableMenuActions);
    this.ctl.menu._enableGenerative(flags.enableGenerative);
    this.ctl.menu._enableFilter(flags.enableFilter);
    this.ctl.input._enableInputElement(flags.enableInputElement);
  }

  /**
   * Apply only the given flags.
   *
   * `enableModal: true` snapshots the current modal-tied flags (once) then
   * disables them unless explicitly overridden (e.g. Confirm keeps keys on).
   * `enableModal: false` restores the snapshot so AppObject settings survive.
   */
  applyFlags(flags?: Partial<UIFlags>) {
    if (!flags) {
      return;
    }
    if ('enableModal' in flags) {
      if (flags.enableModal) {
        if (!this.flagsBeforeModal) {
          this.flagsBeforeModal = this.flags;
        }
        this.applyModalFlags({
          enableGoBack: flags.enableGoBack ?? false,
          enableMenuOpenClose: flags.enableMenuOpenClose ?? false,
          enableKeys: flags.enableKeys ?? false,
          enableMenuActions: flags.enableMenuActions ?? false,
          enableGenerative: flags.enableGenerative ?? false,
          enableFilter: flags.enableFilter ?? false,
          enableInputElement: flags.enableInputElement ?? false
        });
      } else {
        const restore = this.flagsBeforeModal;
        this.flagsBeforeModal = undefined;
        this.applyModalFlags({
          enableGoBack: flags.enableGoBack ?? restore?.enableGoBack ?? true,
          enableMenuOpenClose: flags.enableMenuOpenClose ?? restore?.enableMenuOpenClose ?? true,
          enableKeys: flags.enableKeys ?? restore?.enableKeys ?? true,
          enableMenuActions: flags.enableMenuActions ?? restore?.enableMenuActions ?? true,
          enableGenerative: flags.enableGenerative ?? restore?.enableGenerative ?? true,
          enableFilter: flags.enableFilter ?? restore?.enableFilter ?? true,
          enableInputElement: flags.enableInputElement ?? restore?.enableInputElement ?? true
        });
      }
    } else {
      if ('enableGoBack' in flags) {
        this.ctl.app._enableGoBack(flags.enableGoBack ?? true);
      }
      if ('enableMenuOpenClose' in flags) {
        this.ctl.menu._enableMenuOpenClose(flags.enableMenuOpenClose ?? true);
      }
      if ('enableKeys' in flags) {
        this.ctl.keys._enableKeys(flags.enableKeys ?? true);
      }
      if ('enableMenuActions' in flags) {
        this.ctl.menu._enableMenuActions(flags.enableMenuActions ?? true);
      }
      if ('enableGenerative' in flags) {
        this.ctl.menu._enableGenerative(flags.enableGenerative ?? true);
      }
      if ('enableFilter' in flags) {
        this.ctl.menu._enableFilter(flags.enableFilter ?? true);
      }
      if ('enableInputElement' in flags) {
        this.ctl.input._enableInputElement(flags.enableInputElement ?? true);
      }
      if ('enableMenuItemFocus' in flags) {
        this.ctl.menu._enableMenuItemFocus(flags.enableMenuItemFocus ?? true);
      }
      if ('enableNativeActivation' in flags) {
        this.ctl.keys._enableNativeActivation(flags.enableNativeActivation ?? true);
      }
    }
    if ('focusInputOnStart' in flags) {
      this.focusInputOnStart = flags.focusInputOnStart ?? true;
    }
    if ('focusInputOnMenuOpen' in flags) {
      this.focusInputOnMenuOpen = flags.focusInputOnMenuOpen ?? true;
    }
    if ('clearInputAfterAction' in flags) {
      this.clearInputAfterAction = flags.clearInputAfterAction ?? true;
    }
    if ('clearInputAfterBack' in flags) {
      this.clearInputAfterBack = flags.clearInputAfterBack ?? true;
    }
  }

  private resetFlags(settings?: UIFlags) {
    // Re-enable stuff...
    const enableModal = settings?.enableModal ?? false;
    const flags: UIFlags = {
      enableGoBack: settings?.enableGoBack ?? !enableModal,
      enableMenuOpenClose: settings?.enableMenuOpenClose ?? !enableModal,
      enableKeys: settings?.enableKeys ?? !enableModal,
      enableMenuActions: settings?.enableMenuActions ?? !enableModal,
      enableGenerative: settings?.enableGenerative ?? !enableModal,
      enableFilter: settings?.enableFilter ?? !enableModal,
      enableInputElement: settings?.enableInputElement ?? !enableModal,
      // Not modal-tied: a modal (Alert / Confirm) is a chooser, thus it keeps
      // menu item focus and native activation.
      enableMenuItemFocus: settings?.enableMenuItemFocus ?? true,
      enableNativeActivation: settings?.enableNativeActivation ?? true,
      focusInputOnStart: settings?.focusInputOnStart ?? true,
      focusInputOnMenuOpen: settings?.focusInputOnMenuOpen ?? true,
      clearInputAfterAction: settings?.clearInputAfterAction ?? true,
      clearInputAfterBack: settings?.clearInputAfterBack ?? true
    };

    this.ctl.app._enableGoBack(flags.enableGoBack);
    this.ctl.menu._enableMenuOpenClose(flags.enableMenuOpenClose);
    this.ctl.keys._enableKeys(flags.enableKeys);
    this.ctl.menu._enableMenuActions(flags.enableMenuActions);
    this.ctl.menu._enableGenerative(flags.enableGenerative);
    this.ctl.menu._enableFilter(flags.enableFilter);
    this.ctl.input._enableInputElement(flags.enableInputElement);
    this.ctl.menu._enableMenuItemFocus(flags.enableMenuItemFocus);
    this.ctl.keys._enableNativeActivation(flags.enableNativeActivation);
    this.focusInputOnStart = flags.focusInputOnStart ?? true;
    this.focusInputOnMenuOpen = flags.focusInputOnMenuOpen ?? true;
    this.clearInputAfterAction = flags.clearInputAfterAction ?? true;
    this.clearInputAfterBack = flags.clearInputAfterBack ?? true;
  }

  // #endregion

  // #region actions / menu

  /**
   * Resolve the current AppObject's `actions`, which may be declared directly as
   * an object or as a function that derives them from state.
   */
  private resolveActions(): AppActions | undefined {
    const actions = this.current?.actions;
    return typeof actions === 'function' ? actions() : actions;
  }

  /**
   * Refresh action bindings defined by the AppObject's `actions`.
   */
  invalidate() {
    const resolved = this.resolveActions();
    if (resolved) {
      const keyBindingsMap = Object.entries(resolved).reduce<KeyBindingMap>(
        (acc, [actionId, actionWithBinding]) => {
          if (actionWithBinding.binding) {
            acc[actionId] = {
              ...actionWithBinding.binding,
              action: actionWithBinding.action
            };
          }
          return acc;
        },
        {}
      );
      this.ctl.keys.setBindings(keyBindingsMap);
    }
  }

  handleKeyAction(actionId: string, event: KeyboardEvent, defaultAction?: AppActionHandler) {
    const actions = this.resolveActions();
    const action = actions?.[actionId]?.action ?? defaultAction;
    if (!action) {
      this.ctl.notify(`No action found for ${actionId}`, { duration: 2000 });
      return;
    }

    // Returning false means the action declined; KeysController then leaves the
    // browser default alone. See AppActionHandler.
    return action(this.ctl, { source: 'keyboard', event });
  }

  handleMenuAction(menuItem: MenuItem, menuId: string) {
    const menuActionId = menuItem.id;

    this.setLastMenuActionId(menuId, menuActionId);
    this.ctl.events.emit({
      type: 'menu-action',
      payload: {
        menuId,
        menuActionId
      }
    });

    if (!menuItem.action) {
      this.ctl.notify(`No action found for ${menuActionId}`, { duration: 2000 });
      return;
    }

    const actionOwner = this.current;
    try {
      menuItem.action(this.ctl);
    } finally {
      // clearInputAfterAction triggered only on menu action:
      if (this.clearInputAfterAction && this.current === actionOwner) {
        this.ctl.input.clearInput();
        this.ctl.menu.invalidate();
      }
    }
  }

  /**
   * Get the current declarative menu from AppObject.
   *
   * Returns undefined if .menu() is not defined on the AppObject.
   */
  getMenu() {
    return this.current?.menu?.();
  }

  private setLastMenuActionId(menuId: string, menuActionId: string) {
    if (!this.current) {
      return;
    }
    this.getAppState(this.current).lastMenuActionIds[menuId] = menuActionId;
  }

  /**
   * Returns the last menu action fired for the given menu id in the current
   * AppObject.
   *
   * Menu ids and actions are scoped by AppObject. A single AppObject may render
   * multiple menus during its lifetime, so we track the last action id
   * separately for each menu id.
   */
  getLastMenuActionId(menuId: string) {
    if (!this.current) {
      return undefined;
    }
    return this.getAppState(this.current).lastMenuActionIds[menuId];
  }

  // #endregion

  // #region AppObject lifecycle

  private setCurrent(app: AnyAppObject, fromParent = true) {
    const previous = this.current;
    this.current = app;
    // If layout not set use parent's (INHERIT_LAYOUT).
    // Trivial edge-case: If we never set a layout, then the AppState layout
    // will always be blank.
    if (fromParent) {
      const previousLayout = previous && this.getAppState(previous).layout;
      Object.assign(
        this.getAppState(this.current),
        this.resolveLayout(this.current, previousLayout)
      );
    }
    this.ctl.events.emit({
      type: 'app-change',
      payload: { previous: previous ?? null, current: this.current }
    });
  }

  /**
   * Reset ui and related state.
   *
   * Used for resetting state when a new appObject is run.
   */
  reset(settings?: UIFlags) {
    this.flagsBeforeModal = undefined;
    this.resetFlags(settings);

    // Events
    this.unsubscribeMenuItemFocus?.();
    if (this.current?.onMenuItemFocus) {
      this.unsubscribeMenuItemFocus = this.ctl.events.on(
        'menu-item-focus',
        ({ menuId, index, menuItem }) => {
          this.current?.onMenuItemFocus?.({ menuId, index, menuItem });
        }
      );
    }
    this.unsubscribeMenuUpdate?.();
    this.unsubscribeMenuUpdate = undefined;
    this.unsubscribeInputChange?.();
    if (this.current?.onInputChange) {
      this.unsubscribeInputChange = this.ctl.events.on('input-change', ({ value }) => {
        this.current?.onInputChange?.({ value });
      });
    }
    this.unsubscribeMenuOpenChange?.();
    if (this.current?.onMenuOpenChange) {
      this.unsubscribeMenuOpenChange = this.ctl.events.on('menu-open-change', (open) => {
        this.current?.onMenuOpenChange?.({ open });
      });
    }
    this.unsubscribeMenuOpenFocus?.();
    if (this.focusInputOnMenuOpen) {
      this.unsubscribeMenuOpenFocus = this.ctl.events.on('menu-open-change', (open) => {
        if (open) {
          this.ctl.input.focus();
        }
      });
    }

    // Reset stuff...
    this.resetOnBack();
    this.ctl.keys.resetBindings();
    this.ctl.input.resetPlaceholder();
    this.ctl.menu.resetFocusBehaviour();
    // Tear down any generative menuItemsFn from the outgoing AppObject so its
    // input-change listener can't clobber the next AppObject's menu. The new
    // AppObject re-registers its own in onStart/onResume if it wants one (the
    // same rebuild contract as setMenu/filter above).
    this.ctl.menu.clearGenerative();
    this.ctl.menu.resetFilter();
    this.ctl.input.setInputValue();
    this.ctl.input.resetSubmitHandler();

    // We don't clear notifications or alerts or confirmations.
  }

  /**
   *  Resets things to sane defaults.  You can then set things in your AppObject.run.
   */
  private runBefore() {
    // Apply the AppObject's declared start-time settings (UIFlags). reset()
    // fills in defaults for any flag the AppObject doesn't specify. This runs
    // before onStart/onResume, so any dynamic ui.update({ flags }) still wins.
    this.reset(this.current?.settings);
    // Clear the menu.
    this.ctl.menu.setMenu();
    // Do not report the internal clear above as the AppObject's first update.
    if (this.current?.onMenuUpdate) {
      this.unsubscribeMenuUpdate = this.ctl.events.on(
        'set-menu-items',
        ({ cause, menuId, index, menuItem }) => {
          this.current?.onMenuUpdate?.({ cause, menuId, index, menuItem });
        }
      );
    }
    if (this.current) {
      const { layout, layoutParams } = this.getAppState(this.current);
      if (layout) {
        this.ctl.ui.setLayout(layout);
      }
      if (layout || layoutParams) {
        // Baseline for this AppObject: replace so child mid-flight params
        // (e.g. inputAccept) don't stick on resume.
        this.ctl.ui.update({ params: layoutParams, replace: true });
      }
    }
  }

  private runBeforeExit() {
    this.current?.onExit?.();
  }

  private runBeforeSuspend() {
    this.current?.onSuspend?.();
  }

  run<ResumePayload = unknown, LayoutParams extends AppLayoutParams = AppLayoutParams>(
    appObject: AppObject<ResumePayload, LayoutParams>
  ) {
    // console.warn('run', { appObject });
    this.runBeforeSuspend();
    if (this.current) {
      this.appParents.push(this.current);
    }
    this.setCurrent(appObject);
    this.runBefore();
    appObject.onStart?.();
    this.runAfter();
  }

  /**
   * Pull `menu()` AFTER the AppObject's onStart/onResume has run.
   */
  private runAfter() {
    // Load declarative menu/actions after onStart / onResume to allow AppObject
    // to set any state that might affect the result of .menu()).
    this.ctl.menu.invalidate();
    this.invalidate();
    if (this.focusInputOnStart) {
      this.ctl.input.focus();
    }
  }

  /**
   * The running AppObject can call this to exit itself.
   *
   * When a menu close outro is in progress, pop waits for that outro. When the
   * menu is already closed, pop is immediate.
   */
  exit = (payload?: unknown) => {
    if (this.ctl.menu.isOutroPending) {
      // QUEUE_POP_ON_OUTRO
      this.queuePop(payload);
      return;
    }
    this.pop({ payload });
  };

  /**
   * Close the menu and exit the current AppObject.
   *
   * When the menu is open, pop waits for the close outro so parent chrome does
   * not change while the panel is still visible. When the menu is already
   * closed, pop is immediate.
   */
  closeAndExit = (payload?: unknown) => {
    this.ctl.menu.closeMenu();
    this.exit(payload);
  };

  /**
   * Hold the pop until the menu outro ends.  (QUEUE_POP_ON_OUTRO)
   *
   * Drop the leaving AppObject's `onMenuOpenChange` so the close it already
   * requested does not run the hook again.
   */
  private queuePop(payload?: unknown) {
    if (this.pendingPop !== undefined) {
      return;
    }
    this.pendingPop = { payload };
    this.unsubscribeMenuOpenChange?.();
    this.unsubscribeMenuOpenChange = undefined;
  }

  /**
   * See {@link queuePop}.
   */
  private flushPendingPop = () => {
    if (this.pendingPop === undefined) {
      return;
    }
    const result = this.pendingPop;
    this.pendingPop = undefined;
    this.pop(result);
  };

  private pop = (result?: { payload: unknown }) => {
    // No more parents, do nothing.
    if (this.appParents.length === 0) {
      return;
    }
    this.runBeforeExit();
    const appVal = this.appParents.pop();
    if (appVal) {
      this.setCurrent(appVal, false);
      this.runBefore();
      if (appVal.onResume) {
        appVal.onResume(result);
      } else {
        appVal.onStart?.();
      }
      this.runAfter();
      return;
    }
    return;
  };

  // #endregion

  // #region back-handling

  /**
   * Prefer ctl.ui.update({ flags: { enableGoBack: true } }) instead.
   */
  _enableGoBack(on: boolean = true) {
    this.disableGoBack = !on;
  }

  /**
   * Goes back to previous appObject.
   *
   * Back handler precedence: an imperative `setOnBack` handler (reset per
   * AppObject) wins, then the current AppObject's declarative `onBack`, then the
   * default pop.
   */
  goBack = () => {
    if (this.disableGoBack) {
      return;
    }
    const backOwner = this.current;
    if (this.onBack) {
      this.onBack();
      this.clearInputAfterBackIfCurrent(backOwner);
      return;
    }
    if (this.current?.onBack) {
      this.current.onBack();
      this.clearInputAfterBackIfCurrent(backOwner);
      return;
    }
    this.pop();
    this.clearInputAfterBackIfCurrent(backOwner);
    return;
  };

  private clearInputAfterBackIfCurrent(backOwner?: AnyAppObject) {
    if (this.clearInputAfterBack && this.current === backOwner) {
      this.ctl.input.clearInput();
    }
  }

  setOnBack(onBack: () => void) {
    this.onBack = onBack;
  }

  private resetOnBack() {
    this.onBack = undefined;
  }

  /**
   * True if there is a parent AppObject and enableGoBack flag is true.
   */
  canGoBack() {
    return this.appParents.length > 0 && !this.disableGoBack;
  }

  // #endregion

  // #region user-created events

  /**
   * Deliver a host-app event to the currently active AppObject.
   *
   * Used by host-app UI rendered outside of Oneput (e.g. a node on a canvas)
   * to signal the active AppObject without subscribing.  Routes to `current`
   * the same way handleAction routes actions; no-op if the current AppObject
   * does not implement onEvent.
   */
  emitEvent = (event: AppEvent) => {
    this.current?.onEvent?.(event);
  };

  // #endregion
}
