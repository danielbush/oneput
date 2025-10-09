import type { Controller } from '$lib/oneput/controller.js';
import type { KeyBindingMap } from '$lib/oneput/KeyBinding.js';
import { checkboxMenuItem } from '$lib/oneput/plugins/ui/checkboxMenuItem.js';
import { menuItemWithIcon, MyDefaultUI, type MyDefaultUIValues } from '../config/ui.js';
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

	run = () => {
		this.ctl.ui.applyDefaultUI<MyDefaultUIValues>({
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
					const defaultUI = this.ctl.ui.getDefaultUI<MyDefaultUI>();
					this.createKeysManager(this.ctl, defaultUI?.keys.defaultGlobalKeys || {}, false).run(
						this.run
					);
				}
			}),
			menuItemWithIcon({
				id: 'local-keys',
				text: 'Set local default key bindings...',
				action: () => {
					const defaultUI = this.ctl.ui.getDefaultUI<MyDefaultUI>();
					this.createKeysManager(this.ctl, defaultUI?.keys.defaultLocalKeys || {}, true).run(
						this.run
					);
				}
			})
		]);
	};
}
