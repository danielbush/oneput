import type { Controller } from '$lib/oneput/controller.js';
import { randomId } from '$lib/oneput/lib.js';

export class Alert {
	static create(controller: Controller, title: string, message: string, onClose?: () => void) {
		return new Alert(controller, title, message, onClose);
	}

	constructor(
		private controller: Controller,
		private title: string,
		private message: string,
		private onClose?: () => void
	) {}

	private stop = () => {
		this.controller.menu.enableMenuActions();
		this.controller.menu.enableMenuOpenClose();
		this.controller.menu.enableAllMenuItemsFn();
		this.controller.input.enableInputElement();
		this.controller.ui.replaceUI();
		this.controller.keys.restoreKeys(true);
		this.controller.ui.setPlaceholder();
		this.onClose?.();
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
				children: [
					{
						id: 'alert-title',
						type: 'fchild',
						innerHTMLUnsafe: `<h2>${this.title}</h2>`
					},
					{
						id: 'alert-message',
						type: 'fchild',
						innerHTMLUnsafe: `<p>${this.message}</p>`
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
				]
			}
		});
	};

	run() {
		this.start();
	}
}
