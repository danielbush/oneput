import { vflex } from '../../lib/builder.js';
import type { Controller } from '../../controller.js';

export class Confirm {
	static create(
		controller: Controller,
		{ additional, message }: { additional?: string; message: string }
	) {
		return new Confirm(controller, { additional, message });
	}

	private previousPlaceholder: string;
	private previousActiveElement: HTMLElement | null = null;

	constructor(
		private ctl: Controller,
		private params: { additional?: string; message: string },
		private resolve?: (value: boolean) => void,
		private promise?: Promise<boolean>,
		private okButton?: HTMLElement,
		private cancelButton?: HTMLElement
	) {
		this.previousActiveElement = document.activeElement as HTMLElement;
		this.previousPlaceholder = this.ctl.input.getPlaceholder();
	}

	run(): Promise<boolean> {
		return this.start();
	}

	private start = () => {
		this.ctl.ui.update({
			flags: {
				enableModal: true,
				// Re-enable keys...
				enableKeys: true
			}
		});
		this.ctl.keys.setBindings(
			{
				ok: {
					description: 'OK',
					bindings: ['Enter'],
					action: () => {
						// Support if the user tabs to the cancel button and
						// hits enter.
						if (document.activeElement === this.cancelButton) {
							this.stop(false);
						} else if (document.activeElement === this.okButton) {
							this.stop(true);
						} else {
							this.stop(true);
						}
					}
				},
				cancel: {
					description: 'Cancel',
					bindings: ['Escape'],
					action: () => this.stop(false)
				}
			},
			true
		);

		this.ctl.input.setPlaceholder('"Enter" to accept, "Escape" to cancel...');
		this.ctl.ui.replaceMenuUI({
			menu: vflex({
				id: 'oneput-confirm',
				classes: ['oneput__menu-body-content', 'oneput__alert'],
				children: (b) => [
					b.fchild({
						htmlContentUnsafe: `<h2>${this.params.message}</h2>`
					}),
					this.params.additional &&
						b.fchild({
							htmlContentUnsafe: `<p>${this.params.additional}</p>`
						}),
					b.hflex({
						children: (b) => [
							b.button({
								classes: ['oneput__primary-button'],
								title: 'Ok',
								textContent: 'OK',
								onMount: (node) => {
									this.okButton = node;
									node.focus();
								},
								onClick: () => this.stop(true)
							}),
							b.button({
								classes: ['oneput__secondary-button'],
								title: 'Cancel',
								textContent: 'Cancel',
								onClick: () => this.stop(false),
								onMount: (node) => {
									this.cancelButton = node;
								}
							})
						]
					})
				]
			})
		});
		this.promise = new Promise<boolean>((resolve: (value: boolean) => void) => {
			this.resolve = resolve;
		});
		return this.promise;
	};

	private stop = (ok: boolean) => {
		this.ctl.ui.update({
			flags: {
				enableModal: false
			}
		});

		// Restore
		this.ctl.keys.resetBindings(true);
		this.ctl.ui.replaceMenuUI();
		this.ctl.input.setPlaceholder(this.previousPlaceholder);
		this.resolve?.(ok);
		this.previousActiveElement?.focus();
	};

	async userChooses() {
		return this.promise;
	}
}
