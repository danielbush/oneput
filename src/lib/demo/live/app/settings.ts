import type { Controller } from '$lib/oneput/controller.js';
import { checkboxMenuItem } from '$lib/oneput/plugins/menu/checkboxMenuItem.js';
import { menuItemWithIcon, type MyDefaultUIValues } from '../config/ui.js';
import { KeysManager } from '../service/KeysManager.js';
import { config } from '../service/TestKeyService.js';

export const settingsUI = (ctl: Controller, back: () => void) => {
	ctl.setBackBinding(back);
	const reload = () => {
		settingsUI(ctl, back);
	};
	ctl.ui.configureDefaultUI<MyDefaultUIValues>({
		menuHeader: 'Settings',
		exitAction: back
	});
	ctl.menu.setMenuItems([
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
				KeysManager.create(ctl, ctl.keys.globalDefaultKeys, false).run(reload);
			}
		}),
		menuItemWithIcon({
			id: 'local-keys',
			text: 'Set local default key bindings...',
			action: () => {
				KeysManager.create(ctl, ctl.keys.localDefaultKeys, true).run(reload);
			}
		})
	]);
};
