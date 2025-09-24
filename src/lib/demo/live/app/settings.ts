import type { Controller } from '$lib/oneput/controller.js';
import type { KeyBindingMap } from '$lib/oneput/KeysController.js';
import { checkboxMenuItem } from '$lib/oneput/plugins/menu/checkboxMenuItem.js';
import { menuItemWithIcon, type MyDefaultUIValues } from '../config/ui.js';
import { KeysManager } from '../service/KeysManager.js';
import { config } from '../service/TestKeyService.js';

export class SettingsUI {
	static create(ctl: Controller, back: () => void) {
		return new SettingsUI(ctl, back, KeysManager.create);
	}

	constructor(
		private ctl: Controller,
		private back: () => void,
		private createKeysManager: (
			ctl: Controller,
			keyMap: KeyBindingMap,
			isLocal: boolean
		) => KeysManager
	) {}

	run() {
		this.ctl.setBackBinding(this.back);
		const reload = () => {
			this.run();
		};
		this.ctl.ui.configureDefaultUI<MyDefaultUIValues>({
			menuHeader: 'Settings',
			exitAction: this.back
		});
		this.ctl.menu.setMenuItems([
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
					this.createKeysManager(this.ctl, this.ctl.keys.globalDefaultKeys, false).run(reload);
				}
			}),
			menuItemWithIcon({
				id: 'local-keys',
				text: 'Set local default key bindings...',
				action: () => {
					this.createKeysManager(this.ctl, this.ctl.keys.localDefaultKeys, true).run(reload);
				}
			})
		]);
	}
}
