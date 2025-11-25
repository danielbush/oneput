import type { Controller } from '../controller.js';
import { filterChildren, randomId } from '../lib.js';

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

	constructor(
		private ctl: Controller,
		private params: { additional?: string; message: string },
		private resolve?: () => void
	) {
		this.previousActiveElement = document.activeElement as HTMLElement;
	}

	private stop = () => {
		this.ctl.menu.enableMenuActions();
		this.ctl.menu.enableMenuOpenClose();
		this.ctl.menu.enableMenuItemsFn();
		this.ctl.input.enableInputElement();
		this.ctl.ui.replaceUI();
		this.ctl.keys.resetKeys(true);
		this.ctl.input.setPlaceholder();
		this.resolve?.();
		this.previousActiveElement.focus();
	};

	private start = () => {
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
		this.ctl.menu.disableMenuActions();
		this.ctl.menu.disableMenuOpenClose();
		this.ctl.menu.disableMenuItemsFn();
		this.ctl.input.disableInputElement();
		this.ctl.input.setPlaceholder('Click "ok" or type enter to continue...');
		this.ctl.ui.replaceUI({
			menu: {
				id: randomId(),
				type: 'vflex',
				classes: ['oneput__menu-body-content', 'oneput__alert'],
				children: filterChildren([
					{
						id: 'alert-title',
						type: 'fchild',
						htmlContentUnsafe: `<h2>${this.params.message}</h2>`
					},
					this.params.additional && {
						id: 'alert-additional',
						type: 'fchild',
						htmlContentUnsafe: `<p>${this.params.additional}</p>`
					},
					{
						id: 'alert-button',
						type: 'fchild',
						tag: 'button',
						classes: ['oneput__primary-button'],
						textContent: 'OK',
						onMount: (node) => {
							node.focus();
						},
						attr: {
							onclick: this.stop
						}
					}
				])
			}
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
