import { hflex } from '../../lib/builder.js';
import type { Controller } from '../../controller.js';

export type NotificationParams = {
	duration?: number;
};

export class Notification {
	static create(ctl: Controller) {
		return new Notification(ctl);
	}

	constructor(
		private ctl: Controller,
		private timeoutHandle: ReturnType<typeof setTimeout> | null = null
	) {}

	/**
	 * Run the notification.
	 */
	run(message: string, params: NotificationParams = {}) {
		if (this.timeoutHandle) {
			clearTimeout(this.timeoutHandle);
		}
		if (params.duration) {
			this.timeoutHandle = setTimeout(() => {
				this.ctl.ui.injectUI();
			}, params.duration);
		}
		this.ctl.ui.injectUI({
			inner: hflex({
				id: 'oneput-notification',
				classes: ['oneput__notification'],
				style: { width: '100%' },
				children: (b) => [
					b.fchild({
						textContent: message
					}),
					b.iconButton({
						classes: ['oneput__icon-button'],
						title: 'Close',
						icon: 'CloseNotification',
						onClick: () => {
							this.ctl.ui.injectUI();
						}
					})
				]
			})
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
