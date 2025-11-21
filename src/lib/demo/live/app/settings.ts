import type { Controller } from '$lib/oneput/controller.js';
import { listFilterIcon } from '$lib/oneput/shared/icons.js';
import { checkboxMenuItem } from '$lib/oneput/shared/checkboxMenuItem.js';
import { BindingsEditor } from '$lib/oneput/plugins/bindings/BindingsEditor.js';
import { config, TestBindingsStore } from '$lib/oneput/shared/TestBindingsStore.js';
import { stdMenuItem } from '$lib/oneput/shared/stdMenuItem.js';
import { FiltersUI } from './FiltersUI.js';
import { type MyDefaultUIValues } from '../config/defaultUI.js';

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
				action: () => {
					this.ctl.runUI(BindingsEditor, {
						isLocal: false,
						bindingsStore: TestBindingsStore.create(),
						ui: ({ menuHeader, backAction }) => {
							this.ctl.ui.runDefaultUI<MyDefaultUIValues>({
								menuHeader,
								exitAction: backAction,
								exitType: 'back'
							});
						}
					});
				}
			}),
			stdMenuItem({
				id: 'local-keys',
				textContent: 'Set local default key bindings...',
				action: () => {
					this.ctl.runUI(BindingsEditor, {
						isLocal: true,
						bindingsStore: TestBindingsStore.create(),
						ui: ({ menuHeader, backAction }) => {
							this.ctl.ui.runDefaultUI<MyDefaultUIValues>({
								menuHeader,
								exitAction: backAction,
								exitType: 'back'
							});
						}
					});
				}
			})
		]);
	};
}
