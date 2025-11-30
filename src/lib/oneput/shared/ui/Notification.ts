import type { Controller } from '../../controller.js';
import { randomId } from '../../lib/lib.js';
import { xIcon } from '../../shared/icons.js';

export type NotificationParams = {
	duration?: number;
};

export class Notification {
	static create(controller: Controller, message: string) {
		return new Notification(controller, message);
	}

	constructor(
		private ctl: Controller,
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
				this.ctl.ui.injectUI();
			}, params.duration);
		}
		this.ctl.ui.injectUI({
			inner: {
				id: randomId(),
				type: 'hflex',
				classes: ['oneput__notification'],
				style: { width: '100%' },
				children: [
					{
						id: randomId(),
						type: 'fchild',
						textContent: this.message
					},
					{
						id: randomId(),
						type: 'fchild',
						classes: ['oneput__icon-button'],
						innerHTMLUnsafe: xIcon,
						attr: {
							onclick: () => {
								this.ctl.ui.injectUI();
							}
						}
					}
				]
			}
		});
	}

	clear() {
		if (this.timeoutHandle) {
			clearTimeout(this.timeoutHandle);
		}
		this.timeoutHandle = null;
		this.ctl.ui.injectUI();
	}
}
