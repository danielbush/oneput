import type { Controller } from '$lib/oneput/controller.js';
import { listFilterIcon } from '$lib/oneput/shared/icons.js';
import { checkboxMenuItem } from '$lib/oneput/shared/checkboxMenuItem.js';
import { menuItemWithIcon, type MyDefaultUIValues } from '../config/defaultUI.js';
import { KeysManager } from './KeysManager/KeysManager.js';
import { config, TestBindingsStore } from '../../../oneput/shared/TestBindingsStore.js';
import { FiltersUI } from './FiltersUI.js';

export class SettingsUI {
	static create(ctl: Controller) {
		const ui = new SettingsUI(ctl);
		return ui;
	}

	constructor(private ctl: Controller) {}

	runUI = () => {
		this.ctl.ui.runDefaultUI<MyDefaultUIValues>({
			menuHeader: 'Settings',
			exitAction: this.ctl.goBack
		});
		this.ctl.menu.setMenuItems([
			checkboxMenuItem({
				id: 'simulate-error',
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
					this.ctl.runUI(FiltersUI);
				}
			}),
			menuItemWithIcon({
				id: 'global-keys',
				text: 'Set global default key bindings...',
				action: () => {
					this.ctl.runUI(KeysManager, {
						isLocal: false,
						bindingsStore: TestBindingsStore.create()
					});
				}
			}),
			menuItemWithIcon({
				id: 'local-keys',
				text: 'Set local default key bindings...',
				action: () => {
					this.ctl.runUI(KeysManager, { isLocal: true, bindingsStore: TestBindingsStore.create() });
				}
			})
		]);
	};
}
