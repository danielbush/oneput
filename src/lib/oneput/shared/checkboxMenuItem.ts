import type { Controller } from '$lib/oneput/controller.js';
import { randomId, type FlexParams, type MenuItem } from '$lib/oneput/lib.js';

export class CheckboxMenuItem implements MenuItem {
	static create(params: {
		action: (c: Controller, checked: boolean, node: HTMLInputElement) => void;
		textContent: string;
		checked: boolean;
	}): CheckboxMenuItem {
		return new CheckboxMenuItem(params);
	}

	id: string;
	inputId: string;
	inputElement?: HTMLInputElement;
	type = 'hflex' as const;
	tag = 'button';
	attr = { type: 'button' };
	#action: (c: Controller, checked: boolean, node: HTMLInputElement) => void;
	children: FlexParams['children'];

	constructor(params: {
		action: (c: Controller, checked: boolean, node: HTMLInputElement) => void;
		textContent: string;
		checked: boolean;
	}) {
		this.id = randomId();
		this.inputId = randomId();
		this.#action = params.action;
		this.children = [
			{
				id: this.inputId,
				type: 'fchild',
				tag: 'input',
				attr: {
					type: 'checkbox',
					title: params.textContent,
					checked: params.checked,
					onclick: (event: Event) => {
						event.preventDefault();
					}
				},
				classes: ['oneput__checkbox']
			},
			{
				id: randomId(),
				type: 'fchild',
				tag: 'label',
				attr: {
					for: this.inputId,
					onclick: (event: Event) => {
						event.preventDefault();
					}
				},
				textContent: params.textContent
			}
		];
	}

	onMount = (node: HTMLElement) => {
		this.inputElement = node.querySelector(`#${this.inputId}`) as HTMLInputElement;
	};

	action = (c: Controller) => {
		if (!this.inputElement) {
			return;
		}
		this.inputElement.checked = !this.inputElement.checked;
		this.#action(c, this.inputElement.checked, this.inputElement!);
	};
}

export function checkboxMenuItem(params: {
	id: string;
	action: (c: Controller, checked: boolean, node: HTMLInputElement) => void;
	textContent: string;
	checked: boolean;
}): CheckboxMenuItem {
	return CheckboxMenuItem.create(params);
}
