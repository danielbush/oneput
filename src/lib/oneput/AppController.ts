import type { Controller } from './controller.js';
import type { AppObject } from './lib/lib.js';

export class AppController {
	public static create(ctl: Controller) {
		return new AppController(ctl);
	}

	constructor(private ctl: Controller) {}

	private appParents: AppObject[] = [];
	private currentApp: AppObject | null = null;
	private disableGoBack = false;

	/**
	 * Prefer ctl.ui.update({ enableGoBack: true }) instead.
	 */
	_enableGoBack(on: boolean = true) {
		this.disableGoBack = !on;
	}

	/**
	 *  Resets things to sane defaults.  You can then set things in your AppObject.run.
	 */
	private beforeRun() {
		// console.log(this.appParents, 'current:', this.currentApp);
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

		// We don't clear notifications or alerts or confirmations.
	}

	private runBeforeExit() {
		this.currentApp?.beforeExit?.();
	}

	private replaceApp(appObject: AppObject) {
		this.currentApp = appObject;
	}

	private pushApp(appObject: AppObject) {
		if (this.currentApp) {
			this.appParents.push(this.currentApp);
		}
		this.currentApp = appObject;
	}

	run(appObject: AppObject) {
		this.runBeforeExit();
		if (this.currentApp?.onBack) {
			if (appObject.onBack) {
				this.replaceApp(appObject);
			} else {
				// Don't replace, appObject will run but we don't track it.
				// This allows an onBack app to run nested apps but stay in
				// control and handle any back actions.
			}
		} else {
			if (appObject.onBack) {
				this.replaceApp(appObject);
			} else {
				this.replaceApp(appObject);
			}
		}
		this.beforeRun();
		appObject.run();
	}

	runInline(run: () => void) {
		this.run({ run });
	}

	push(appObject: AppObject) {
		this.runBeforeExit();
		this.pushApp(appObject);
		this.beforeRun();
		appObject.run();
	}

	pushInline(run: () => void) {
		this.push({ run });
	}

	private pop = () => {
		this.runBeforeExit();
		const lastApp = this.appParents.pop();
		if (lastApp) {
			this.currentApp = lastApp;
			this.beforeRun();
			lastApp.run();
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
}
