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

	run(appObject: AppObject) {
		this.runBeforeExit();
		if (this.currentApp) {
			this.appParents.push(this.currentApp);
		}
		this.currentApp = appObject;
		this.beforeRun();
		appObject.run();
	}

	private pop = () => {
		this.runBeforeExit();
		const appObject = this.appParents.pop();
		if (appObject) {
			this.currentApp = appObject;
			this.beforeRun();
			appObject.run();
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
			this.currentApp.onBack(this.pop);
			return;
		}
		this.pop();
		return;
	};

	setUnwindPointToParent() {
		const parent: AppObject | undefined = this.appParents[this.appParents.length - 1];
		return () => {
			this.unwindTo(parent);
		};
	}

	private unwindTo(parent: AppObject | undefined) {
		if (!parent) {
			return;
		}

		for (
			let app: AppObject | undefined | null = this.currentApp;
			app;
			app = this.appParents.pop()
		) {
			if (app === parent) {
				this.currentApp = app;
				break;
			}
			app.beforeExit?.();
		}
	}
}
