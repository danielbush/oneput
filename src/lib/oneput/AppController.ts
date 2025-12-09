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

	/**
	 * If the currentUI defines onBack, we disable push/pop and let it decide
	 * what to do.
	 */
	private get trackUIChange() {
		return !this.currentUI?.onBack;
	}

	private runBeforeExit() {
		this.currentUI?.beforeExit?.();
		this.inlineUIExit?.();
		this.inlineUIExit = undefined;
	}

	push(appObject: AppObject) {
		this.runBeforeExit();
		if (this.currentUI && this.trackUIChange) {
			this.uiParents.push(this.currentUI);
		}
		if (this.trackUIChange) {
			this.currentUI = appObject;
		}
		this.beforeRun();
		appObject.run();
		return appObject;
	}

	private inlineUIExit: (() => void) | undefined = undefined;

	runInline(run: () => (() => void) | void | Promise<(() => void) | void>) {
		this.runBeforeExit();
		if (this.currentUI && this.trackUIChange) {
			this.uiParents.push(this.currentUI);
		}
		if (this.trackUIChange) {
			this.currentUI = { run: run };
		}
		this.beforeRun();
		const result = run();
		if (typeof result === 'function') {
			this.inlineUIExit = result;
		} else if (result instanceof Promise) {
			result.then((fn) => {
				if (typeof fn === 'function') {
					this.inlineUIExit = fn;
				}
			});
		}
		return { run };
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
