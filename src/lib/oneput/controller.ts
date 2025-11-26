import { MenuController } from './MenuController.js';
import { InternalEventEmitter } from './InternalEventEmitter.js';
import { InputController } from './InputController.js';
import { KeysController } from './KeysController.js';
import { UIController } from './UIController.js';
import { Notification, type NotificationParams } from './plugins/Notification.js';
import type { OneputProps, UIClass, UIObject } from './lib.js';
import { Alert } from './plugins/Alert.js';
import { Confirm } from './plugins/Confirm.js';

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

	private uiParents: UIObject[] = [];
	private currentUI: UIObject | null = null;

	/**
	 *  Resets things to sane defaults.  You can then set things in your UIObject.runUI.
	 */
	private beforeRunUI() {
		// Re-enable stuff...
		this.menu.enableMenuActions();
		this.menu.enableMenuOpenClose();
		this.menu.enableMenuItemsFn();
		this.input.enableInputElement();

		// Reset stuff...
		this.keys.resetBindings();
		this.keys.resetBindings(true);
		this.input.resetPlaceholder();
		this.menu.resetFocusBehaviour();
		this.menu.resetMenuItemsFn();
		this.input.setInputValue();
		this.input.resetSubmitHandler();
	}

	runUI<V extends Record<string, unknown>>(uiClass: UIClass<V>, values?: V) {
		if (this.currentUI) {
			this.uiParents.push(this.currentUI);
		}
		const ui = uiClass.create(this, values ?? ({} as V));
		this.currentUI = ui;
		this.beforeRunUI();
		ui.runUI();
		return ui;
	}

	runInlineUI(ui: UIObject) {
		if (this.currentUI) {
			this.uiParents.push(this.currentUI);
		}
		this.currentUI = ui;
		this.beforeRunUI();
		ui.runUI();
		return ui;
	}

	/**
	 * This is intended for triggering a back action via keyboard.
	 */
	readonly goBack = () => {
		this.currentUI?.beforeExit?.();
		const lastUI = this.uiParents.pop();
		if (lastUI) {
			this.currentUI = lastUI;
			this.beforeRunUI();
			lastUI.runUI();
			return lastUI;
		}
		return null;
	};

	notify(message: string, params: NotificationParams = {}): Notification {
		const notification = Notification.create(this, message);
		notification.run(params);
		return notification;
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
}
