import type { Controller } from '$lib/oneput/controller.js';
import { listFilterIcon } from '$lib/oneput/shared/icons.js';
import { checkboxMenuItem } from '$lib/oneput/shared/ui/menuItems/checkboxMenuItem.js';
import { BindingsEditor } from '$lib/oneput/shared/appObjects/BindingsEditor.js';
import { config } from '$lib/demo/live/service/TestBindingsStore.js';
import { stdMenuItem } from '$lib/oneput/shared/ui/menuItems/stdMenuItem.js';
import { FiltersUI } from './FiltersUI.js';
import { LocalBindingsService } from '$lib/oneput/shared/bindings/LocalBindingsService.js';

export class SettingsUI {
	static create(ctl: Controller) {
		const createGlobalBindingsEditor = () => {
			const bindingsService = LocalBindingsService.create(ctl);
			return BindingsEditor.create(ctl, {
				isLocal: false,
				keyBindingMap: ctl.keys.getDefaultBindings(true),
				onUpdate: (keyBindingMap, isLocal) => {
					return bindingsService.update(keyBindingMap, isLocal);
				}
			});
		};
		const createLocalBindingsEditor = () => {
			const bindingsService = LocalBindingsService.create(ctl);
			return BindingsEditor.create(ctl, {
				isLocal: true,
				keyBindingMap: ctl.keys.getDefaultBindings(false),
				onUpdate: (keyBindingMap, isLocal) => {
					return bindingsService.update(keyBindingMap, isLocal);
				}
			});
		};
		const createFiltersUI = () => {
			return FiltersUI.create(ctl);
		};
		return new SettingsUI(
			ctl,
			createGlobalBindingsEditor,
			createLocalBindingsEditor,
			createFiltersUI
		);
	}

	constructor(
		private ctl: Controller,
		private createGlobalBindingsEditor: () => BindingsEditor,
		private createLocalBindingsEditor: () => BindingsEditor,
		private createFiltersUI: () => FiltersUI
	) {}

	onStart = () => {
		this.run();
	};

	run = () => {
		this.ctl.ui.update({
			params: {
				menuTitle: 'Settings'
			}
		});
		this.ctl.menu.setMenuItems({
			id: 'main',
			items: [
				checkboxMenuItem({
					id: 'simulate-error',
					textContent: 'Toggle simulate error storing bindings',
					checked: config.simulateError,
					action: (_, checked) => {
						config.toggleSimulateError(checked);
					}
				}),
				stdMenuItem({
					id: 'default-filter',
					left: (b) => [b.icon({ innerHTMLUnsafe: listFilterIcon })],
					textContent: 'Set default typing filter...',
					action: () => {
						this.ctl.app.run(this.createFiltersUI());
					}
				}),
				stdMenuItem({
					id: 'global-keys',
					textContent: 'Set global default key bindings...',
					left: (b) => [b.icon({ icon: 'keyboard' })],
					action: () => {
						this.ctl.app.run(this.createGlobalBindingsEditor());
					}
				}),
				stdMenuItem({
					id: 'local-keys',
					textContent: 'Set local default key bindings...',
					left: (b) => [b.icon({ icon: 'keyboard' })],
					action: () => {
						this.ctl.app.run(this.createLocalBindingsEditor());
					}
				})
			]
		});
	};
}
