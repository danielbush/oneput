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
		private ctl: Controller,
		private params: { additional?: string; message: string },
		private resolve?: (value: boolean) => void,
		private promise?: Promise<boolean>
	) {}

	run(): Promise<boolean> {
		return this.start();
	}

	private start = () => {
		this.ctl.keys.setKeys(
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
		this.ctl.menu.disableMenuActions();
		this.ctl.menu.disableMenuOpenClose();
		this.ctl.menu.disableMenuItemsFn();
		this.ctl.input.disableInputElement();
		this.ctl.ui.setPlaceholder('"Enter" to accept, "Escape" to cancel...');
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
								classes: ['oneput__secondary-button'],
								textContent: 'Cancel',
								attr: {
									onclick: () => this.stop(false)
								}
							}
						]
					}
				])
			}
		});
		this.promise = new Promise<boolean>((resolve: (value: boolean) => void) => {
			this.resolve = resolve;
		});
		return this.promise;
	};

	private stop = (ok: boolean) => {
		this.ctl.menu.enableMenuActions();
		this.ctl.menu.enableMenuOpenClose();
		this.ctl.menu.enableMenuItemsFn();
		this.ctl.input.enableInputElement();
		this.ctl.ui.replaceUI();
		this.ctl.keys.unsetKeys(true);
		this.ctl.ui.setPlaceholder();
		this.resolve?.(ok);
	};

	async userChooses() {
		return this.promise;
	}
}
