import type { Controller } from './controller.js';
import type {
  AppActions,
  AppEvent,
  AppLayoutParams,
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
    ctl.events.on('menu-action', ({ menuId, menuActionId }) => {
      this.setLastMenuActionId(menuId, menuActionId);
    });
  }

  private appParents: AnyAppObject[] = [];
  private appStates = new WeakMap<AnyAppObject, AppObjectState>();
  private current?: AnyAppObject;
  private onBack?: () => void;
  private disableGoBack = false;
  private unsubscribeMenuItemFocus?: () => void;
  private unsubscribeInputChange?: () => void;
  private unsubscribeMenuOpenChange?: () => void;

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

  get flags() {
    return {
      enableGoBack: !this.disableGoBack,
      enableMenuOpenClose: this.ctl.menu.enableMenuOpenClose
      // TODO: add other flags?
    };
  }

  /**
   * Apply only the given flags.
   */
  applyFlags(flags?: Partial<UIFlags>) {
    if (!flags) {
      return;
    }
    if ('enableGoBack' in flags || 'enableModal' in flags) {
      this.ctl.app._enableGoBack(flags.enableGoBack ?? !flags.enableModal);
    }
    if ('enableMenuOpenClose' in flags || 'enableModal' in flags) {
      this.ctl.menu._enableMenuOpenClose(flags.enableMenuOpenClose ?? !flags.enableModal);
    }
    if ('enableKeys' in flags || 'enableModal' in flags) {
      this.ctl.keys._enableKeys(flags.enableKeys ?? !flags.enableModal);
    }
    if ('enableMenuActions' in flags || 'enableModal' in flags) {
      this.ctl.menu._enableMenuActions(flags.enableMenuActions ?? !flags.enableModal);
    }
    if ('enableGenerative' in flags || 'enableModal' in flags) {
      this.ctl.menu._enableGenerative(flags.enableGenerative ?? !flags.enableModal);
    }
    if ('enableFilter' in flags || 'enableModal' in flags) {
      this.ctl.menu._enableFilter(flags.enableFilter ?? !flags.enableModal);
    }
    if ('enableInputElement' in flags || 'enableModal' in flags) {
      this.ctl.input._enableInputElement(flags.enableInputElement ?? !flags.enableModal);
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
      enableInputElement: settings?.enableInputElement ?? !enableModal
    };

    this.ctl.app._enableGoBack(flags.enableGoBack);
    this.ctl.menu._enableMenuOpenClose(flags.enableMenuOpenClose);
    this.ctl.keys._enableKeys(flags.enableKeys);
    this.ctl.menu._enableMenuActions(flags.enableMenuActions);
    this.ctl.menu._enableGenerative(flags.enableGenerative);
    this.ctl.menu._enableFilter(flags.enableFilter);
    this.ctl.input._enableInputElement(flags.enableInputElement);
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
  invalidateActions() {
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

  /**
   * The current AppObject should handle the action.
   *
   * Favour actions defined within the AppObject, fallback to defaultActions.
   *
   * @param actionId
   * @param defaultAction An action defined outside of any AppObject.
   */
  handleAction(
    evt: KeyboardEvent,
    actionId: string,
    defaultAction: ((ctl: Controller, evt: KeyboardEvent) => void) | undefined
  ) {
    const actions = this.resolveActions();
    if (actions?.[actionId]) {
      actions[actionId]?.action(this.ctl, evt);
      return;
    }
    if (defaultAction) {
      defaultAction(this.ctl, evt);
      return;
    }

    this.ctl.notify(`No action found for ${actionId}`, { duration: 2000 });
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
    // Events
    this.unsubscribeMenuItemFocus?.();
    if (this.current?.onMenuItemFocus) {
      this.unsubscribeMenuItemFocus = this.ctl.events.on(
        'menu-item-focus',
        ({ index, menuItem }) => {
          this.current?.onMenuItemFocus?.({ index, menuItem });
        }
      );
    }
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

    this.resetFlags(settings);

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
    this.ctl.menu.resetFillHandler();

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
    if (this.current) {
      const { layout, layoutParams } = this.getAppState(this.current);
      if (layout) {
        this.ctl.ui.setLayout(layout);
      }
      if (layout || layoutParams) {
        this.ctl.ui.update({ params: layoutParams });
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
    this.invalidateActions();
  }

  /**
   * The running AppObject can call this to exit itself.
   */
  exit = (payload?: unknown) => {
    this.pop({ payload });
  };

  /**
   * A convenience function that closes menu and exits the current AppObject.
   *
   * We close first to take advantage of the MenuController suppressing unwanted
   * flashes of changed menu items caused by the exit to the parent AppObject
   * whilst the menu is closing.
   */
  closeAndExit = (payload?: unknown) => {
    this.ctl.menu.closeMenu();
    this.pop({ payload });
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
    if (this.onBack) {
      this.onBack();
      return;
    }
    if (this.current?.onBack) {
      this.current.onBack();
      return;
    }
    this.pop();
    return;
  };

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
