import type { Controller } from '$lib/oneput/controller.js';
import { filterChildren, randomId } from '$lib/oneput/lib.js';

export class Confirm {
	static create(
		controller: Controller,
		{ additional, message }: { additional?: string; message: string }
	) {
		return new Confirm(controller, { additional, message });
	}

	constructor(
		private controller: Controller,
		private params: { additional?: string; message: string },
		private resolve?: (value: boolean) => void
	) {}

	run(): Promise<boolean> {
		return this.start();
	}

	private start = () => {
		this.controller.keys.setTempKeys(
			{
				ok: {
					description: 'OK',
					bindings: ['Enter'],
					action: () => this.stop(true)
				},
				cancel: {
					description: 'Cancel',
					bindings: ['Escape'],
					action: () => this.stop(false)
				}
			},
			true
		);
		this.controller.menu.disableMenuActions();
		this.controller.menu.disableMenuOpenClose();
		this.controller.menu.disableAllMenuItemsFn();
		this.controller.input.disableInputElement();
		this.controller.ui.setPlaceholder('"Enter" to accept, "Escape" to cancel...');
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
						id: randomId(),
						type: 'hflex',
						children: [
							{
								id: randomId(),
								type: 'fchild',
								tag: 'button',
								classes: ['oneput__primary-button'],
								textContent: 'Ok',
								onMount: (node) => {
									node.focus();
								},
								attr: {
									onclick: () => this.stop(true)
								}
							},
							{
								id: randomId(),
								type: 'fchild',
								tag: 'button',
								classes: ['oneput__primary-button'],
								textContent: 'Cancel',
								onMount: (node) => {
									node.focus();
								},
								attr: {
									onclick: () => this.stop(false)
								}
							}
						]
					}
				])
			}
		});
		const promise = new Promise<boolean>((resolve: (value: boolean) => void) => {
			this.resolve = resolve;
		});
		return promise;
	};

	private stop = (ok: boolean) => {
		this.controller.menu.enableMenuActions();
		this.controller.menu.enableMenuOpenClose();
		this.controller.menu.enableAllMenuItemsFn();
		this.controller.input.enableInputElement();
		this.controller.ui.replaceUI();
		this.controller.keys.restoreKeys(true);
		this.controller.ui.setPlaceholder();
		this.resolve?.(ok);
	};
}
