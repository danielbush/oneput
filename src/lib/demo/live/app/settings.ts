import type { Controller } from '$lib/oneput/controller.js';
import { listFilterIcon } from '$lib/oneput/shared/icons.js';
import type { KeyBindingMap } from '$lib/oneput/KeyBinding.js';
import { randomId } from '$lib/oneput/lib.js';
import { checkboxMenuItem } from '$lib/oneput/plugins/ui/checkboxMenuItem.js';
import { menuItemWithIcon, MyDefaultUI, type MyDefaultUIValues } from '../config/ui.js';
import { KeysManager } from '../service/KeysManager.js';
import { config } from '../service/TestKeyService.js';
import { SettingsManager } from '../service/SettingsManager.js';

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

	runUI = () => {
		this.ctl.ui.runDefaultUI<MyDefaultUIValues>({
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
				id: 'default-filter',
				leftIcon: listFilterIcon,
				text: 'Set default typing filter...',
				action: () => {
					FiltersUI.create(this.ctl, this.runUI).runUI();
				}
			}),
			menuItemWithIcon({
				id: 'global-keys',
				text: 'Set global default key bindings...',
				action: () => {
					const defaultUI = this.ctl.ui.getDefaultUI<MyDefaultUI>();
					this.createKeysManager(this.ctl, defaultUI?.keys.defaultGlobalKeys || {}, false).runUI(
						this.runUI
					);
				}
			}),
			menuItemWithIcon({
				id: 'local-keys',
				text: 'Set local default key bindings...',
				action: () => {
					const defaultUI = this.ctl.ui.getDefaultUI<MyDefaultUI>();
					this.createKeysManager(this.ctl, defaultUI?.keys.defaultLocalKeys || {}, true).runUI(
						this.runUI
					);
				}
			})
		]);
	};
}

export class FiltersUI {
	static create(ctl: Controller, back: () => void) {
		return new FiltersUI(ctl, back);
	}

	constructor(
		private ctl: Controller,
		private back: () => void
	) {}

	runUI() {
		this.ctl.ui.runDefaultUI({
			menuHeader: 'Filters',
			exitAction: this.back
		});

		this.ctl.menu.setMenuItems([
			menuItemWithIcon({
				id: randomId(),
				leftIcon: listFilterIcon,
				text: 'Fuzzy Filter',
				action: () => {
					SettingsManager.create(this.ctl).setFilter('fuzzy');
					this.ctl.notify('Fuzzy Filter set', { duration: 3000 });
					this.back();
				}
			}),
			menuItemWithIcon({
				id: randomId(),
				leftIcon: listFilterIcon,
				text: 'Word Filter',
				action: () => {
					SettingsManager.create(this.ctl).setFilter('word');
					this.ctl.notify('Word Filter set', { duration: 3000 });
					this.back();
				}
			})
		]);
	}
}
