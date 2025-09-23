import type { Controller } from '$lib/oneput/controller.js';
import { KeyBindingsController } from '$lib/oneput/plugins/menu/editBindings.js';
import { checkboxMenuItem } from '$lib/oneput/plugins/menu/checkboxMenuItem.js';
import { menuItemWithIcon, type MyDefaultUIValues } from '../config/ui.js';
import { KeysManager } from '../service/KeysManager.js';
import { config } from '../service/TestKeyService.js';

export const settingsUI = (c: Controller, back: () => void) => {
	c.setBackBinding(back);
	c.ui.configureDefaultUI<MyDefaultUIValues>({
		menuHeader: 'Settings',
		exitAction: back
	});
	c.menu.setMenuItems([
		checkboxMenuItem({
			textContent: 'Toggle simulate error storing bindings',
			checked: config.simulateError,
			action: (_, checked) => {
				config.toggleSimulateError(checked);
			}
		}),
		menuItemWithIcon({
			id: 'global-keys',
			text: 'Set global default key bindings...',
			action: () => {
				const keyMap = c.keys.globalDefaultKeys;
				const km = KeysManager.create(c, keyMap);
				KeyBindingsController.create({
					controller: c,
					onChange: (newKeyMap) => km.updateKeys(newKeyMap, false),
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
				const keyMap = c.keys.localDefaultKeys;
				const km = KeysManager.create(c, keyMap);
				KeyBindingsController.create({
					controller: c,
					onChange: (newKeyMap) => km.updateKeys(newKeyMap, true),
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
