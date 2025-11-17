import { MenuController } from './MenuController.js';
import { InternalEventEmitter } from './InternalEventEmitter.js';
import { InputController } from './InputController.js';
import { KeysController } from './KeysController.js';
import { UIController } from './UIController.js';
import { Notification, type NotificationParams } from './plugins/Notification.js';
import type { OneputProps } from './lib.js';
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
		this.keys = KeysController.create(this.events, this, this.menu.isMenuOpen);
		this.ui = UIController.create(this);
	}

	toggleHide() {
		window.dispatchEvent(new Event('oneput-toggle-hide'));
	}

	/**
	 * This is intended for triggering a back action via keyboard.
	 */
	goBack: () => void = () => {};

	/**
	 * Sets the back action to run the supplied function - this can be triggered if given a keybinding.
	 */
	setBackBinding(back?: () => void) {
		this.goBack = back || (() => {});
	}

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
