import type { Controller } from '$lib/oneput/controller.js';
import { keyboardIcon, listFilterIcon } from '$lib/oneput/shared/icons.js';
import { checkboxMenuItem } from '$lib/oneput/shared/checkboxMenuItem.js';
import { BindingsEditor } from '$lib/oneput/shared/bindings/BindingsEditor.js';
import { config } from '$lib/demo/live/service/TestBindingsStore.js';
import { stdMenuItem } from '$lib/oneput/shared/stdMenuItem.js';
import { FiltersUI } from './FiltersUI.js';
import { type LayoutSettings } from '../layout.js';
import { LocalBindingsService } from '$lib/oneput/shared/bindings/LocalBindingsService.js';

export class SettingsUI {
	static create(ctl: Controller) {
		const ui = new SettingsUI(ctl, LocalBindingsService.create(ctl));
		return ui;
	}

	constructor(
		private ctl: Controller,
		private bindingsService: LocalBindingsService
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
					this.ctl.runUI(FiltersUI);
				}
			}),
			stdMenuItem({
				id: 'global-keys',
				textContent: 'Set global default key bindings...',
				left: (b) => [b.icon({ innerHTMLUnsafe: keyboardIcon })],
				action: () => {
					this.ctl.runUI(BindingsEditor, {
						isLocal: false,
						keyBindingMap: this.ctl.keys.getDefaultKeys(false),
						onUpdate: (keyBindingMap, isLocal) => {
							return this.bindingsService.update(keyBindingMap, isLocal);
						},
						runLayout: ({ menuHeader, backAction, exitAction }) => {
							this.ctl.ui.runLayout<LayoutSettings>({
								menuHeader,
								exitAction,
								backAction
							});
						}
					});
				}
			}),
			stdMenuItem({
				id: 'local-keys',
				textContent: 'Set local default key bindings...',
				left: (b) => [b.icon({ innerHTMLUnsafe: keyboardIcon })],
				action: () => {
					this.ctl.runUI(BindingsEditor, {
						isLocal: true,
						keyBindingMap: this.ctl.keys.getDefaultKeys(true),
						onUpdate: (keyBindingMap, isLocal) => {
							return this.bindingsService.update(keyBindingMap, isLocal);
						},
						runLayout: ({ menuHeader, backAction, exitAction }) => {
							this.ctl.ui.runLayout<LayoutSettings>({
								menuHeader,
								exitAction,
								backAction
							});
						}
					});
				}
			})
		]);
	};
}
