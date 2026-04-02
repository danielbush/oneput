import type { Controller } from './controller.js';
import type { AppObject, UIFlags } from '../types.js';
import { AppVal } from './helpers/AppVal.js';
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
    ctl.events.on('set-menu-items', ({ menuId }) => {
      this.current?.setMenuId(menuId);
    });
    ctl.events.on('menu-action', ({ menuId, menuActionId }) => {
      this.current?.setLastMenuActionId(menuId, menuActionId);
    });
  }

  private appParents: AppVal[] = [];
  private _current: AppVal | null = null;
  private onBack?: () => void;
  private disableGoBack = false;
  private get current() {
    return this._current || null;
  }
  private set current(appVal: AppVal | null) {
    const previous = this._current?.app ?? null;
    this._current = appVal;
    const current = appVal?.app ?? null;
    const change = { previous, current };
    this.ctl.events.emit({ type: 'app-change', payload: change });
  }
  private unsubscribeMenuItemFocus?: () => void;

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
    if ('enableMenuItemsFn' in flags || 'enableModal' in flags) {
      this.ctl.menu.fn._enableMenuItemsFn(flags.enableMenuItemsFn ?? !flags.enableModal);
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

    // Re-enable stuff...
    const enableModal = settings?.enableModal ?? false;
    const flags: UIFlags = {
      enableGoBack: settings?.enableGoBack ?? !enableModal,
      enableMenuOpenClose: settings?.enableMenuOpenClose ?? !enableModal,
      enableKeys: settings?.enableKeys ?? !enableModal,
      enableMenuActions: settings?.enableMenuActions ?? !enableModal,
      enableMenuItemsFn: settings?.enableMenuItemsFn ?? !enableModal,
      enableInputElement: settings?.enableInputElement ?? !enableModal
    };

    this.ctl.app._enableGoBack(flags.enableGoBack);
    this.ctl.menu._enableMenuOpenClose(flags.enableMenuOpenClose);
    this.ctl.keys._enableKeys(flags.enableKeys);
    this.ctl.menu._enableMenuActions(flags.enableMenuActions);
    this.ctl.menu.fn._enableMenuItemsFn(flags.enableMenuItemsFn);
    this.ctl.input._enableInputElement(flags.enableInputElement);

    // Reset stuff...
    this.resetOnBack();
    this.ctl.keys.resetBindings();
    this.ctl.input.resetPlaceholder();
    this.ctl.menu.resetFocusBehaviour();
    this.ctl.menu.fn.resetMenuItemsFn();
    this.ctl.input.setInputValue();
    this.ctl.input.resetSubmitHandler();
    this.ctl.menu.resetFillHandler();

    // We don't clear notifications or alerts or confirmations.

    return flags;
  }

  /**
   *  Resets things to sane defaults.  You can then set things in your AppObject.run.
   */
  private runBefore() {
    this.reset();
    if (this.current?.app.menu) {
      this.ctl.menu.setMenu(this.current.app.menu());
    }
    if (this.current?.app.actions) {
      const keyBindingsMap = Object.entries(this.current.app.actions).reduce<KeyBindingMap>(
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

  private runBeforeExit() {
    this.current?.app.onExit?.();
  }

  run<R = unknown>(appObject: AppObject<R>) {
    // console.warn('run', { appObject });
    this.runBeforeExit();
    if (this.current) {
      this.appParents.push(this.current);
    }
    this.current = AppVal.create(appObject as AppObject);
    this.runBefore();
    appObject.onStart();
  }

  /**
   * The running AppObject can call this to exit itself.
   */
  exit = (payload?: unknown) => {
    this.pop({ payload });
  };

  private pop = (result?: { payload: unknown }) => {
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
      return;
    }
    return;
  };

  /**
   * Goes back to previous appObject.
   */
  goBack = () => {
    if (this.disableGoBack) {
      return;
    }
    if (this.onBack) {
      this.onBack();
      return;
    }
    this.pop();
    return;
  };

  setOnBack(onBack: () => void) {
    this.onBack = onBack;
  }

  resetOnBack() {
    this.onBack = undefined;
  }

  /**
   * Returns details about the menu with menuId including the last action that
   * was fired.  If menuId is not provided, it will return details about the
   * last menu that was set via setMenu.
   *
   * Assumes you have called setMenu within the current appObject with
   * the given id.
   *
   * NOTE: it seems easier to put this in menu controller, but for the fact
   * that menu id's and actions are scoped by appObjects.   So we implement it
   * here and return values only for the current appObject.
   */
  getMenu(menuId?: string) {
    if (!menuId) {
      menuId = this.current?.menuId;
    }
    return {
      menuId,
      lastActionId: menuId && this.current?.getLastMenuActionId(menuId),
      exists: !!menuId && this.current?.menuExists(menuId)
    };
  }

  /**
   * The current AppObject should handle the action.
   *
   * Favour actions defined within the AppObject, fallback to defaultActions.
   *
   * @param actionId
   * @param defaultAction An action defined outside of any AppObject.
   */
  handleAction(actionId: string, defaultAction: ((ctl: Controller) => void) | undefined) {
    if (this.current?.app.actions?.[actionId]) {
      this.current.app.actions?.[actionId]?.action(this.ctl);
      return;
    }
    if (defaultAction) {
      defaultAction(this.ctl);
      return;
    }

    this.ctl.notify(`No action found for ${actionId}`, { duration: 2000 });
  }
}
