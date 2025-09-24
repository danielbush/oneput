import { randomId, type OneputControllerProps } from './lib.js';
import { MenuController } from './MenuController.js';
import { InternalEventEmitter } from './InternalEventEmitter.js';
import { InputController } from './InputController.js';
import { KeysController } from './KeysController.js';
import { UIController } from './UIController.js';
import { xIcon } from './shared/icons.js';

type NotificationParams = {
	duration?: number;
};

class Notification {
	static create(currentProps: Controller['currentProps'], message: string) {
		return new Notification(currentProps, message);
	}

	constructor(
		private currentProps: Controller['currentProps'],
		private message: string,
		private timeoutHandle: ReturnType<typeof setTimeout> | null = null
	) {}

	/**
	 * Use this to update a message on an existing notification that presumably
	 * is already showing.
	 */
	updateMessage(message: string, params: NotificationParams = {}) {
		this.message = message;
		this.run(params);
	}

	run(params: NotificationParams = {}) {
		if (this.timeoutHandle) {
			clearTimeout(this.timeoutHandle);
		}
		if (params.duration) {
			this.timeoutHandle = setTimeout(() => {
				this.currentProps.injectUI = undefined;
			}, params.duration);
		}
		this.currentProps.injectUI = {
			inner: {
				id: randomId(),
				type: 'hflex',
				classes: ['oneput__notification'],
				style: { width: '100%' },
				children: [
					{
						id: randomId(),
						type: 'fchild',
						classes: ['oneput__menu-item-body'],
						textContent: this.message
					},
					{
						id: randomId(),
						type: 'fchild',
						classes: ['oneput__icon-button'],
						innerHTMLUnsafe: xIcon,
						attr: {
							onclick: () => {
								this.currentProps.injectUI = undefined;
							}
						}
					}
				]
			}
		};
	}
}

export class Controller {
	private events = new InternalEventEmitter();
	public menu: MenuController;
	public input: InputController;
	public keys: KeysController;
	public ui: UIController;

	/**
	 * @param currentProps Should be reactive eg $state<OneputControllerProps>({...})
	 */
	constructor(private currentProps: OneputControllerProps) {
		this.menu = MenuController.create(this.currentProps, this.events);
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
