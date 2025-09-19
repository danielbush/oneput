import type { Controller } from '$lib/oneput/controller.js';
import { KeyBindingsController } from '$lib/oneput/plugins/menu/editBindings.js';
import { checkboxMenuItem } from '$lib/oneput/plugins/menu/checkboxMenuItem.js';
import { menuItemWithIcon, type MyDefaultUIValues } from '../config/ui.js';
import { TestKeyService } from '../service/TestKeyService.js';

const testKeyService = new TestKeyService();

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
