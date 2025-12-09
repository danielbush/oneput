import { MenuController } from './MenuController.js';
import { InternalEventEmitter } from './InternalEventEmitter.js';
import { InputController } from './InputController.js';
import { KeysController } from './KeysController.js';
import { UIController } from './UIController.js';
import { Notification, type NotificationParams } from './shared/ui/Notification.js';
import type { OneputProps, AppObject } from './lib/lib.js';
import { Alert } from './shared/ui/Alert.js';
import { Confirm } from './shared/ui/Confirm.js';

export class Controller {
	public events = new InternalEventEmitter();
	public menu: MenuController;
	public input: InputController;
	public keys: KeysController;
	public ui: UIController;

	/**
	 * @param currentProps Should be reactive eg $state<OneputProps>({...})
	 */
	constructor(public currentProps: OneputProps) {
		this.menu = MenuController.create(this);
		this.input = InputController.create(this);
		this.keys = KeysController.create(this);
		this.ui = UIController.create(this);
	}

	toggleHide() {
		window.dispatchEvent(new Event('oneput-toggle-hide'));
	}

	private uiParents: AppObject[] = [];
	private currentUI: AppObject | null = null;
	private disableGoBack = false;

	enableGoBack(on: boolean = true) {
		this.disableGoBack = !on;
	}

	/**
	 *  Resets things to sane defaults.  You can then set things in your AppObject.runUI.
	 */
	private beforeRunUI() {
		console.log(this.uiParents, 'current:', this.currentUI);
		// Re-enable stuff...
		this.menu.enableMenuActions();
		this.menu.enableMenuOpenClose();
		this.menu.enableMenuItemsFn();
		this.input.enableInputElement();
		this.enableGoBack();

		// Reset stuff...
		this.keys.resetBindings();
		this.keys.resetBindings(true);
		this.input.resetPlaceholder();
		this.menu.resetFocusBehaviour();
		this.menu.resetMenuItemsFn();
		this.input.setInputValue();
		this.input.resetSubmitHandler();

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

	runUI(appObject: AppObject) {
		this.runBeforeExit();
		if (this.currentUI && this.trackUIChange) {
			this.uiParents.push(this.currentUI);
		}
		if (this.trackUIChange) {
			this.currentUI = appObject;
		}
		this.beforeRunUI();
		appObject.runUI();
		return appObject;
	}

	private inlineUIExit: (() => void) | undefined = undefined;

	runInlineUI(runUI: () => (() => void) | void | Promise<(() => void) | void>) {
		this.runBeforeExit();
		if (this.currentUI && this.trackUIChange) {
			this.uiParents.push(this.currentUI);
		}
		if (this.trackUIChange) {
			this.currentUI = { runUI };
		}
		this.beforeRunUI();
		const result = runUI();
		if (typeof result === 'function') {
			this.inlineUIExit = result;
		} else if (result instanceof Promise) {
			result.then((fn) => {
				if (typeof fn === 'function') {
					this.inlineUIExit = fn;
				}
			});
		}
		return { runUI };
	}

	private popUI = () => {
		this.runBeforeExit();
		const lastUI = this.uiParents.pop();
		if (lastUI) {
			this.currentUI = lastUI;
			this.beforeRunUI();
			lastUI.runUI();
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
			this.currentUI.onBack(this.popUI);
			return;
		}
		this.popUI();
		return;
	};

	private notification = Notification.create(this);

	notify(message: string, params: NotificationParams = {}): Notification {
		this.notification.run(message, params);
		return this.notification;
	}
	clearNotifications() {
		this.notification.clear();
	}

	alert(params: { message: string; additional: string }): Alert {
		const alert = Alert.create(this, params);
		alert.run();
		return alert;
	}

	confirm(params: { additional?: string; message: string }): Confirm {
		const confirm = Confirm.create(this, params);
		confirm.run();
		return confirm;
	}

	setModal(isModal: boolean = true) {
		this.enableGoBack(!isModal);
		this.keys.enableKeys(!isModal);
		this.menu.enableMenuActions(!isModal);
		this.menu.enableMenuOpenClose(!isModal);
		this.menu.enableMenuItemsFn(!isModal);
		this.input.enableInputElement(!isModal);
	}
}
