import type { Controller } from '$lib/oneput/controller.js';
import { randomId } from '$lib/oneput/lib.js';

export class Alert {
	static create(currentProps: Controller['currentProps'], title: string, message: string) {
		return new Alert(currentProps, title, message);
	}

	constructor(
		private currentProps: Controller['currentProps'],
		private title: string,
		private message: string
	) {}

	run(onClose?: () => void) {
		this.currentProps.replaceUI = {
			menu: {
				id: randomId(),
				type: 'vflex',
				classes: ['oneput__menu-body-content'],
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
						attr: {
							onclick: () => {
								onClose?.();
								this.currentProps.replaceUI = undefined;
							}
						}
					}
				]
			}
		};
	}
}
