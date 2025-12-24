import type { Controller } from './controller.js';
import type { AppObject } from './lib/lib.js';

export class AppController {
	public static create(ctl: Controller) {
		return new AppController(ctl);
	}

	constructor(private ctl: Controller) {}

	private appParents: AppObject[] = [];
	private _currentApp: AppObject | null = null;

	private get currentApp() {
		return this._currentApp;
	}

	private set currentApp(app: AppObject | null) {
		// console.warn('currentApp is now', app);
		this._currentApp = app;
	}

	private disableGoBack = false;

	/**
	 * Prefer ctl.ui.update({ enableGoBack: true }) instead.
	 */
	_enableGoBack(on: boolean = true) {
		this.disableGoBack = !on;
	}

	private unsubscribeMenuItemFocus?: () => void;

	/**
	 * Performs resets similar to what is called before a new AppObject is run.
	 */
	public reset() {
		this.beforeRun();
	}

	/**
	 *  Resets things to sane defaults.  You can then set things in your AppObject.run.
	 */
	private beforeRun() {
		// Events
		this.unsubscribeMenuItemFocus?.();
		if (this.currentApp?.onMenuItemFocus) {
			this.unsubscribeMenuItemFocus = this.ctl.events.on(
				'menu-item-focus',
				({ index, menuItem }) => {
					this.currentApp?.onMenuItemFocus?.({ index, menuItem });
				}
			);
		}

		// Re-enable stuff...
		this.ctl.menu._enableMenuActions();
		this.ctl.menu._enableMenuOpenClose();
		this.ctl.menu._enableMenuItemsFn();
		this.ctl.input._enableInputElement();
		this._enableGoBack();

		// Reset stuff...
		this.ctl.keys.resetBindings();
		this.ctl.keys.resetBindings(true);
		this.ctl.input.resetPlaceholder();
		this.ctl.menu.resetFocusBehaviour();
		this.ctl.menu.resetMenuItemsFn();
		this.ctl.input.setInputValue();
		this.ctl.input.resetSubmitHandler();
		this.ctl.menu.resetFillHandler();

		// We don't clear notifications or alerts or confirmations.
	}

	private runBeforeExit() {
		this.currentApp?.beforeExit?.();
	}

	run<R = unknown>(appObject: AppObject<R>) {
		this.runBeforeExit();
		if (this.currentApp) {
			this.appParents.push(this.currentApp);
		}
		this.currentApp = appObject as AppObject;
		this.beforeRun();
		appObject.onStart();
	}

	public exit = (payload?: unknown) => {
		this.pop({ payload });
	};

	private pop = (result?: { payload: unknown }) => {
		this.runBeforeExit();
		const appObject = this.appParents.pop();
		if (appObject) {
			this.currentApp = appObject;
			this.beforeRun();
			if (appObject.onResume) {
				appObject.onResume?.(result);
			} else {
				appObject.onStart();
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
		if (this.currentApp?.onBack) {
			this.currentApp.onBack();
			return;
		}
		this.pop();
		return;
	};
}
