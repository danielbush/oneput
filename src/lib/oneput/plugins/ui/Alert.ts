import type { Controller } from '$lib/oneput/controller.js';
import { filterChildren, randomId } from '$lib/oneput/lib.js';

export class Alert {
	static create(
		controller: Controller,
		params: { additional?: string; message: string; onClose?: () => void }
	) {
		return new Alert(controller, params);
	}

	constructor(
		private controller: Controller,
		private params: { additional?: string; message: string; onClose?: () => void }
	) {}

	private stop = () => {
		this.controller.menu.enableMenuActions();
		this.controller.menu.enableMenuOpenClose();
		this.controller.menu.enableAllMenuItemsFn();
		this.controller.input.enableInputElement();
		this.controller.ui.replaceUI();
		this.controller.keys.restoreKeys(true);
		this.controller.ui.setPlaceholder();
		this.params.onClose?.();
	};

	private start = () => {
		this.controller.keys.setTempKeys(
			{
				ok: {
					description: 'OK',
					bindings: ['Enter'],
					action: this.stop
				}
			},
			true
		);
		this.controller.menu.disableMenuActions();
		this.controller.menu.disableMenuOpenClose();
		this.controller.menu.disableAllMenuItemsFn();
		this.controller.input.disableInputElement();
		this.controller.ui.setPlaceholder('Click "ok" or type enter to continue...');
		this.controller.ui.replaceUI({
			menu: {
				id: randomId(),
				type: 'vflex',
				classes: ['oneput__menu-body-content', 'oneput__alert'],
				children: filterChildren([
					{
						id: 'alert-title',
						type: 'fchild',
						innerHTMLUnsafe: `<h2>${this.params.message}</h2>`
					},
					this.params.additional && {
						id: 'alert-additional',
						type: 'fchild',
						innerHTMLUnsafe: `<p>${this.params.additional}</p>`
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
	};

	run() {
		this.start();
	}
}
