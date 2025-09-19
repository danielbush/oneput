import type { Controller } from '$lib/oneput/controller.js';
import { randomId, type FlexParams, type MenuItem } from '$lib/oneput/lib.js';
import { KeyBindingsController } from '$lib/oneput/plugins/menu/editBindings.js';
import { menuItemWithIcon, type MyDefaultUIValues } from '../config/ui.js';
import { testKeyService } from '../service/TestKeyService.js';

class CheckboxMenuItem implements MenuItem {
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
				classes: ['oneput__menu-item-body'],
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

function checkboxMenuItem(params: {
	action: (c: Controller, checked: boolean, node: HTMLInputElement) => void;
	textContent: string;
	checked: boolean;
}): CheckboxMenuItem {
	return CheckboxMenuItem.create(params);
}

export const settingsUI = (c: Controller, back: () => void) => {
	c.setBackBinding(back);
	c.ui.setDefaultUI<MyDefaultUIValues>({
		menuHeader: 'Settings',
		exitAction: back
	});
	c.menu.setMenuItems([
		checkboxMenuItem({
			textContent: 'Toggle simulate error storing bindings',
			checked: testKeyService.simulateError,
			action: (c, checked) => {
				testKeyService.toggleSimulateError(checked);
			}
		}),
		menuItemWithIcon({
			id: 'global-keys',
			text: 'Set global default key bindings...',
			action: () => {
				let keyMap = c.keys.globalDefaultKeys;
				const k = KeyBindingsController.create({
					controller: c,
					onChange: (newKeyMap) => {
						// Optimistic update
						c.keys.setDefaultKeys(newKeyMap, false);
						k.setKeys(newKeyMap);
						// Push to store
						testKeyService
							.setGlobalKeys(newKeyMap)
							.then(() => {
								keyMap = newKeyMap;
								c.notify('It worked!');
							})
							.catch((err) => {
								c.notify(err.message);
								// Revert optimistic update...
								k.setKeys(keyMap);
								c.keys.setDefaultKeys(keyMap, false);
							});
					},
					keyMap,
					local: false,
					back: () => {
						settingsUI(c, back);
					}
				});
			}
		}),
		menuItemWithIcon({
			id: 'local-keys',
			text: 'Set local default key bindings...',
			action: () => {
				let keyMap = c.keys.localDefaultKeys;
				const k = KeyBindingsController.create({
					controller: c,
					onChange: (newKeyMap) => {
						c.keys.setDefaultKeys(newKeyMap, true);
						k.setKeys(newKeyMap);
						// See global above....
						testKeyService
							.setLocalKeys(newKeyMap)
							.then(() => {
								keyMap = newKeyMap;
								c.notify('It worked!');
							})
							.catch((err) => {
								c.notify(err.message);
								// Revert optimistic update...
								k.setKeys(keyMap);
								c.keys.setDefaultKeys(keyMap, true);
							});
					},
					keyMap,
					local: true,
					back: () => {
						settingsUI(c, back);
					}
				});
			}
		})
	]);
};
