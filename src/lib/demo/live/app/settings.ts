import type { Controller } from '$lib/oneput/controller.js';
import type { KeyBindingMap } from '$lib/oneput/KeysController.js';
import { KeyBindingsController } from '$lib/oneput/plugins/menu/editBindings.js';
import { menuItemWithIcon, type MyDefaultUIValues } from '../config/ui.js';

const testKeyService = {
	setGlobalKeys: async (keyMap: KeyBindingMap) => {
		return new Promise((resolve) => {
			setTimeout(() => {
				resolve(keyMap);
			}, 1000);
		});
	},
	setLocalKeys: async (keyMap: KeyBindingMap) => {
		return new Promise((resolve) => {
			setTimeout(() => {
				resolve(keyMap);
			}, 1000);
		});
	}
};

export const settingsUI = (c: Controller, back: () => void) => {
	c.setBackBinding(back);
	c.ui.setDefaultUI<MyDefaultUIValues>({
		menuHeader: 'Settings',
		exitAction: back
	});
	c.menu.setMenuItems([
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
								// c.notify(...)
							})
							.catch(() => {
								// c.notify(...)
								// Revert optimistic update...
								k.setKeys(keyMap);
								// c.setDefaultKeys(keyMap)
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
								// c.notify(...)
							})
							.catch(() => {
								// c.notify(...)
								// Revert optimistic update...
								k.setKeys(keyMap);
								// c.setDefaultKeys(localKeys)
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
