import type { Controller } from '$lib/oneput/controller.js';
import { randomId } from '$lib/oneput/lib.js';
import { xIcon } from '$lib/oneput/shared/icons.js';

export type NotificationParams = {
	duration?: number;
};

export class Notification {
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
