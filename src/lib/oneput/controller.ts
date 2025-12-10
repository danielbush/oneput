import { MenuController } from './MenuController.js';
import { InternalEventEmitter } from './InternalEventEmitter.js';
import { InputController } from './InputController.js';
import { KeysController } from './KeysController.js';
import { UIController } from './UIController.js';
import { Notification, type NotificationParams } from './shared/ui/Notification.js';
import type { OneputProps } from './lib/lib.js';
import { Alert } from './shared/ui/Alert.js';
import { Confirm } from './shared/ui/Confirm.js';
import { AppController } from './AppController.js';

export class Controller {
	public events = new InternalEventEmitter();
	public menu: MenuController;
	public input: InputController;
	public keys: KeysController;
	public ui: UIController;
	public app: AppController;

	/**
	 * @param currentProps Should be reactive eg $state<OneputProps>({...})
	 */
	constructor(public currentProps: OneputProps) {
		this.menu = MenuController.create(this);
		this.input = InputController.create(this);
		this.keys = KeysController.create(this);
		this.ui = UIController.create(this);
		this.app = AppController.create(this);
	}

	toggleHide() {
		window.dispatchEvent(new Event('oneput-toggle-hide'));
	}

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

	enableModal(isModal: boolean = true) {
		this.app.enableGoBack(!isModal);
		this.keys.enableKeys(!isModal);
		this.menu.enableMenuActions(!isModal);
		this.menu.enableMenuOpenClose(!isModal);
		this.menu.enableMenuItemsFn(!isModal);
		this.input.enableInputElement(!isModal);
	}
}
