import { MenuController } from './MenuController.js';
import { InternalEventEmitter } from './InternalEventEmitter.js';
import { InputController } from './InputController.js';
import { KeysController } from './KeysController.js';
import { UIController } from './UIController.js';
import { Notification, type NotificationParams } from './plugins/ui/Notification.js';
import type { OneputProps } from './lib.js';

export class Controller {
	private events = new InternalEventEmitter();
	public menu: MenuController;
	public input: InputController;
	public keys: KeysController;
	public ui: UIController;

	/**
	 * @param currentProps Should be reactive eg $state<OneputProps>({...})
	 */
	constructor(private currentProps: OneputProps) {
		this.menu = MenuController.create(this, this.currentProps, this.events);
		this.input = InputController.create(this.currentProps, this.events);
		this.keys = KeysController.create(this.events, this, this.menu.menuOpen);
		this.ui = UIController.create(this.currentProps);
	}

	toggleHide() {
		window.dispatchEvent(new Event('oneput-toggle-hide'));
	}

	/**
	 * This is intended for triggering a back action via keyboard.
	 */
	goBack: () => void = () => {};

	setBackBinding(back?: () => void) {
		this.goBack = back || (() => {});
	}

	doAction() {
		if (this.menu.currentMenuItem) {
			if (this.menu.currentMenuItem.action) {
				this.menu.currentMenuItem.action(this);
			}
		}
	}

	notify(message: string, params: NotificationParams = {}): Notification {
		const notification = Notification.create(this.currentProps, message);
		notification.run(params);
		return notification;
	}
}
