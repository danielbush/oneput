import type { Controller } from './controller.js';
import type { AppActions, AppEvent, AppObject, FocusBehaviour, UIFlags } from '../types.js';
import { AppObjectWrapper } from './helpers/AppObjectWrapper.js';
import type { KeyBindingMap } from '../lib/bindings.js';

export type AppChange = {
  previous: AppObject | null;
  current: AppObject | null;
};

export type AppChangeTracker = {
  data: AppChange[];
  stop: () => void;
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
      this.current?.setLastMenuActionId(menuId, menuActionId);
    });
  }

  private appParents: AppObjectWrapper[] = [];
  private _current: AppObjectWrapper | null = null;
  private onBack?: () => void;
  private disableGoBack = false;
  private get current() {
    return this._current || null;
  }
  private set current(appVal: AppObjectWrapper | null) {
    const previous = this._current?.app ?? null;
    this._current = appVal;
    const current = appVal?.app ?? null;
    const change = { previous, current };
    this.ctl.events.emit({ type: 'app-change', payload: change });
  }
  private unsubscribeMenuItemFocus?: () => void;
  private unsubscribeInputChange?: () => void;
  private unsubscribeMenuOpenChange?: () => void;

  /**
   * Prefer ctl.ui.update({ flags: { enableGoBack: true } }) instead.
   */
  _enableGoBack(on: boolean = true) {
    this.disableGoBack = !on;
  }

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

  /**
   * Reset ui and related state.
   *
   * Used for resetting state when a new appObject is run.
   */
  reset(settings?: UIFlags) {
    // Events
    this.unsubscribeMenuItemFocus?.();
    if (this.current?.app.onMenuItemFocus) {
      this.unsubscribeMenuItemFocus = this.ctl.events.on(
        'menu-item-focus',
        ({ index, menuItem }) => {
          this.current?.app.onMenuItemFocus?.({ index, menuItem });
        }
      );
    }
    this.unsubscribeInputChange?.();
    if (this.current?.app.onInputChange) {
      this.unsubscribeInputChange = this.ctl.events.on('input-change', ({ value }) => {
        this.current?.app.onInputChange?.({ value });
      });
    }
    this.unsubscribeMenuOpenChange?.();
    if (this.current?.app.onMenuOpenChange) {
      this.unsubscribeMenuOpenChange = this.ctl.events.on('menu-open-change', (open) => {
        this.current?.app.onMenuOpenChange?.({ open });
      });
    }

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

    return flags;
  }

  /**
   * Get the current declarative menu from AppObject.
   *
   * Returns undefined if .menu() is not defined on the AppObject.
   */
  getMenu() {
    return this.current?.menu();
  }

  /**
   * Resolve the current AppObject's `actions`, which may be declared directly as
   * an object or as a function that derives them from state.
   */
  private resolveActions(): AppActions | undefined {
    const actions = this.current?.app.actions;
    return typeof actions === 'function' ? actions() : actions;
  }

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
   *  Resets things to sane defaults.  You can then set things in your AppObject.run.
   */
  private runBefore() {
    this.reset();
    // Clear the menu.
    this.ctl.menu.setMenu();
  }

  private runBeforeExit() {
    this.current?.app.onExit?.();
  }

  private runBeforeSuspend() {
    this.current?.app.onSuspend?.();
  }

  run<ResumePayload = unknown>(appObject: AppObject<ResumePayload>) {
    // console.warn('run', { appObject });
    this.runBeforeSuspend();
    if (this.current) {
      this.appParents.push(this.current);
    }
    this.current = AppObjectWrapper.create(appObject as AppObject);
    this.runBefore();
    appObject.onStart();
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
      this.current = appVal;
      this.runBefore();
      if (appVal.app.onResume) {
        appVal.app.onResume(result);
      } else {
        appVal.app.onStart();
      }
      this.runAfter();
      return;
    }
    return;
  };

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
    if (this.current?.app.onBack) {
      this.current.app.onBack();
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

  /**
   * Returns the last menu action fired for the given menu id in the current
   * AppObject.
   *
   * Menu ids and actions are scoped by AppObject. A single AppObject may render
   * multiple menus during its lifetime, so we track the last action id
   * separately for each menu id.
   */
  getLastMenuActionId(menuId: string) {
    return this.current?.getLastMenuActionId(menuId);
  }

  /**
   * Deliver a host-app event to the currently active AppObject.
   *
   * Used by host-app UI rendered outside of Oneput (e.g. a node on a canvas)
   * to signal the active AppObject without subscribing.  Routes to `current`
   * the same way handleAction routes actions; no-op if the current AppObject
   * does not implement onEvent.
   */
  emitEvent = (event: AppEvent) => {
    this.current?.app.onEvent?.(event);
  };

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
}
