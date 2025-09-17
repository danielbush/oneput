import type { Controller } from '$lib/oneput/controller.js';
import type { KeyBindingMap } from '$lib/oneput/KeysController.js';
import { randomId } from '$lib/oneput/lib.js';
import { KeyBindingsController } from '$lib/oneput/plugins/menu/editBindings.js';
import { menuItemWithIcon, type MyDefaultUIValues } from '../config/ui.js';

const testKeyService = {
	simulateError: false,
	setGlobalKeys: async (keyMap: KeyBindingMap) => {
		return new Promise((resolve, reject) => {
			setTimeout(() => {
				if (testKeyService.simulateError) {
					reject(new Error('Simulate error'));
				}
				resolve(keyMap);
			}, 1000);
		});
	},
	setLocalKeys: async (keyMap: KeyBindingMap) => {
		return new Promise((resolve, reject) => {
			if (testKeyService.simulateError) {
				reject(new Error('Simulate error'));
			}
			setTimeout(() => {
				resolve(keyMap);
			}, 1000);
		});
	},
	toggleSimulateError: (on: boolean) => {
		testKeyService.simulateError = on;
	}
};

export const settingsUI = (c: Controller, back: () => void) => {
	c.setBackBinding(back);
	c.ui.setDefaultUI<MyDefaultUIValues>({
		menuHeader: 'Settings',
		exitAction: back
	});
	c.menu.setMenuItems([
		{
			id: 'toggle-simulate-error',
			type: 'hflex',
			tag: 'button',
			attr: { type: 'button' },
			action: () => {
				testKeyService.toggleSimulateError(!testKeyService.simulateError);
				settingsUI(c, back);
			},
			children: [
				{
					id: 'simulate-error-storing-bindings',
					type: 'fchild',
					tag: 'input',
					attr: {
						type: 'checkbox',
						title: 'simulate-error-storing-bindings',
						checked: testKeyService.simulateError,
						onchange: (evt) => {
							testKeyService.toggleSimulateError((evt.target as HTMLInputElement).checked);
						}
					},
					classes: ['oneput__checkbox']
				},
				{
					id: randomId(),
					type: 'fchild',
					tag: 'label',
					attr: {
						for: 'simulate-error-storing-bindings'
					},
					classes: ['oneput__menu-item-body'],
					textContent: 'Toggle simulate error storing bindings'
				}
			]
		},
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
