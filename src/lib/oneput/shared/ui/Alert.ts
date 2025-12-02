import { vflex } from '$lib/oneput/lib/builder.js';
import type { Controller } from '../../controller.js';

/**
 * Alert.run returns a promise.
 *
 * You can await it if you wish to treat the alert as part of the flow in your code.
 * Or you can just run and forget.
 */
export class Alert {
	static create(controller: Controller, params: { additional?: string; message: string }) {
		return new Alert(controller, params);
	}

	private okPromise: Promise<void> | null = null;
	private previousActiveElement: HTMLElement;
	private previousPlaceholder: string;

	constructor(
		private ctl: Controller,
		private params: { additional?: string; message: string },
		private resolve?: () => void
	) {
		this.previousActiveElement = document.activeElement as HTMLElement;
		this.previousPlaceholder = this.ctl.input.getPlaceholder();
	}

	private stop = () => {
		this.ctl.setModal(false);

		// Restore
		this.ctl.keys.resetBindings(true);
		this.ctl.ui.replaceMenuUI();
		this.ctl.input.setPlaceholder(this.previousPlaceholder);
		this.resolve?.();
		this.previousActiveElement.focus();
	};

	private start = () => {
		this.ctl.setModal();
		this.ctl.keys.setBindings(
			{
				ok: {
					description: 'OK',
					bindings: ['Enter'],
					action: this.stop
				}
			},
			true
		);
		this.ctl.keys.enableKeys();

		this.ctl.input.setPlaceholder('Click "ok" or type enter to continue...');
		this.ctl.ui.replaceMenuUI({
			menu: vflex({
				id: 'oneput-alert',
				classes: ['oneput__menu-body-content', 'oneput__alert'],
				children: (b) => [
					b.fchild({
						htmlContentUnsafe: `<h2>${this.params.message}</h2>`
					}),
					this.params.additional &&
						b.fchild({
							htmlContentUnsafe: `<p>${this.params.additional}</p>`
						}),
					b.button({
						classes: ['oneput__primary-button'],
						title: 'Ok',
						textContent: 'OK',
						onMount: (node) => {
							node.focus();
						},
						attr: {
							onclick: this.stop
						}
					})
				]
			})
		});
		this.okPromise = new Promise<void>((resolve: () => void) => {
			this.resolve = resolve;
		});
		return this.okPromise;
	};

	async userClicksOk() {
		return this.okPromise;
	}

	cancel() {
		this.stop();
	}

	run() {
		return this.start();
	}
}
