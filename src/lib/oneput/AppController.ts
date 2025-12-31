import type { Controller } from './controller.js';
import type { AppObject } from './types.js';

class AppVal {
	static create(app: AppObject) {
		return new AppVal(app);
	}

	constructor(app: AppObject) {
		this.app = app;
	}

	app: AppObject;
	lastMenuActions: Record<string, string> = {};
	menuId?: string;

	setLastMenuActionId(menuId: string, menuActionId: string) {
		this.lastMenuActions[menuId] = menuActionId;
	}

	setMenuId(menuId: string) {
		this.menuId = menuId;
	}

	getLastMenuActionId(menuId: string) {
		return this.lastMenuActions[menuId];
	}

	menuExists(menuId: string) {
		return Object.keys(this.lastMenuActions).includes(menuId);
	}
}

export class AppController {
	public static create(ctl: Controller) {
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

	private get current() {
		return this._current || null;
	}

	private set current(appVal: AppVal | null) {
		// console.warn('currentApp is now', app);
		this._current = appVal;
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
		if (this.current?.app.onMenuItemFocus) {
			this.unsubscribeMenuItemFocus = this.ctl.events.on(
				'menu-item-focus',
				({ index, menuItem }) => {
					this.current?.app.onMenuItemFocus?.({ index, menuItem });
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
		this.current?.app.beforeExit?.();
	}

	run<R = unknown>(appObject: AppObject<R>) {
		console.log('run', { appObject });
		this.runBeforeExit();
		if (this.current) {
			this.appParents.push(this.current);
		}
		this.current = AppVal.create(appObject as AppObject);
		this.beforeRun();
		appObject.onStart();
	}

	public exit = (payload?: unknown) => {
		this.pop({ payload });
	};

	private pop = (result?: { payload: unknown }) => {
		this.runBeforeExit();
		const appVal = this.appParents.pop();
		if (appVal) {
			this.current = appVal;
			this.beforeRun();
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
		if (this.current?.app.onBack) {
			const menu = this.getMenu();
			this.current.app.onBack({ menu });
			return;
		}
		this.pop();
		return;
	};

	/**
	 * Returns details about the menu with menuId including the last action that
	 * was fired.  If menuId is not provided, it will return details about the
	 * last menu that was set via setMenuItems.
	 *
	 * Assumes you have called setMenuItems within the current appObject with
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
}
