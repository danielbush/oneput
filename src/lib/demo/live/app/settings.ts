import type { Controller } from '$lib/oneput/controller.js';
import { KeyBindingsController } from '$lib/oneput/plugins/menu/bindings/mod.js';
import { menuItemWithIcon } from '$lib/ui.js';
import { globalKeys, localKeys } from '../config/keys.js';
import type { MyDefaultUIValues } from '../config/ui.js';

export const settingsUI = (c: Controller, back: () => void) => {
	c.setBackBinding(back);
	c.ui.setDefaultUI<MyDefaultUIValues>({
		menuHeader: 'Settings',
		exit: back
	});
	c.menu.setMenuItems([
		menuItemWithIcon({
			id: 'global-keys',
			text: 'Set global key bindings...',
			action: () => {
				KeyBindingsController.create(c, globalKeys, false, () => {
					settingsUI(c, back);
				});
			}
		}),
		menuItemWithIcon({
			id: 'local-keys',
			text: 'Set local key bindings...',
			action: () => {
				KeyBindingsController.create(c, localKeys, true, () => {
					settingsUI(c, back);
				});
			}
		})
	]);
};
