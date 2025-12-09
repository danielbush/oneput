import type { Controller } from '$lib/oneput/controller.js';
import { keyboardIcon, listFilterIcon } from '$lib/oneput/shared/icons.js';
import { checkboxMenuItem } from '$lib/oneput/shared/ui/checkboxMenuItem.js';
import { BindingsEditor } from '$lib/oneput/shared/plugins/BindingsEditor.js';
import { config } from '$lib/demo/live/service/TestBindingsStore.js';
import { stdMenuItem } from '$lib/oneput/shared/ui/stdMenuItem.js';
import { FiltersUI } from './FiltersUI.js';
import { type LayoutSettings } from '../layout.js';
import { LocalBindingsService } from '$lib/oneput/shared/bindings/LocalBindingsService.js';

export class SettingsUI {
	static create(ctl: Controller) {
		const createGlobalBindingsEditor = () => {
			const bindingsService = LocalBindingsService.create(ctl);
			return BindingsEditor.create(ctl, {
				isLocal: true,
				keyBindingMap: ctl.keys.getDefaultBindings(true),
				onUpdate: (keyBindingMap, isLocal) => {
					return bindingsService.update(keyBindingMap, isLocal);
				},
				runLayout: ({ menuHeader, backAction, exitAction }) => {
					ctl.ui.runLayout<LayoutSettings>({
						menuHeader,
						exitAction,
						backAction
					});
				}
			});
		};
		const createLocalBindingsEditor = () => {
			const bindingsService = LocalBindingsService.create(ctl);
			return BindingsEditor.create(ctl, {
				isLocal: false,
				keyBindingMap: ctl.keys.getDefaultBindings(false),
				onUpdate: (keyBindingMap, isLocal) => {
					return bindingsService.update(keyBindingMap, isLocal);
				},
				runLayout: ({ menuHeader, backAction, exitAction }) => {
					ctl.ui.runLayout<LayoutSettings>({
						menuHeader,
						exitAction,
						backAction
					});
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

	runUI = () => {
		this.ctl.ui.runLayout<LayoutSettings>({
			menuHeader: 'Settings'
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
			stdMenuItem({
				id: 'default-filter',
				left: (b) => [b.icon({ innerHTMLUnsafe: listFilterIcon })],
				textContent: 'Set default typing filter...',
				action: () => {
					this.ctl.runUI(this.createFiltersUI());
				}
			}),
			stdMenuItem({
				id: 'global-keys',
				textContent: 'Set global default key bindings...',
				left: (b) => [b.icon({ innerHTMLUnsafe: keyboardIcon })],
				action: () => {
					this.ctl.runUI(this.createGlobalBindingsEditor());
				}
			}),
			stdMenuItem({
				id: 'local-keys',
				textContent: 'Set local default key bindings...',
				left: (b) => [b.icon({ innerHTMLUnsafe: keyboardIcon })],
				action: () => {
					this.ctl.runUI(this.createLocalBindingsEditor());
				}
			})
		]);
	};
}
