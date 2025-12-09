import type { Controller } from './controller.js';
import type { AppObject } from './lib/lib.js';

export class AppController {
	public static create(ctl: Controller) {
		return new AppController(ctl);
	}

	constructor(private ctl: Controller) {}

	private uiParents: AppObject[] = [];
	private currentUI: AppObject | null = null;
	private disableGoBack = false;

	enableGoBack(on: boolean = true) {
		this.disableGoBack = !on;
	}

	/**
	 *  Resets things to sane defaults.  You can then set things in your AppObject.run.
	 */
	private beforeRun() {
		console.log(this.uiParents, 'current:', this.currentUI);
		// Re-enable stuff...
		this.ctl.menu.enableMenuActions();
		this.ctl.menu.enableMenuOpenClose();
		this.ctl.menu.enableMenuItemsFn();
		this.ctl.input.enableInputElement();
		this.enableGoBack();

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
		this.currentUI?.beforeExit?.();
	}

	private replaceApp(appObject: AppObject) {
		this.currentUI = appObject;
	}

	private pushApp(appObject: AppObject) {
		if (this.currentUI) {
			this.uiParents.push(this.currentUI);
		}
		this.currentUI = appObject;
	}

	run(appObject: AppObject) {
		this.runBeforeExit();
		if (this.currentUI?.onBack) {
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
		const lastUI = this.uiParents.pop();
		if (lastUI) {
			this.currentUI = lastUI;
			this.beforeRun();
			lastUI.run();
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
		if (this.currentUI?.onBack) {
			this.currentUI.onBack(this.pop);
			return;
		}
		this.pop();
		return;
	};
}
