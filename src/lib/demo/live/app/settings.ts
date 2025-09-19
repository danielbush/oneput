import type { Controller } from '$lib/oneput/controller.js';
import { KeyBindingsController } from '$lib/oneput/plugins/menu/editBindings.js';
import { checkboxMenuItem } from '$lib/oneput/plugins/menu/checkboxMenuItem.js';
import { menuItemWithIcon, type MyDefaultUIValues } from '../config/ui.js';
import { TestKeyService } from '../service/TestKeyService.js';
import type { KeyBindingMap } from '$lib/oneput/KeysController.js';

const testKeyService = new TestKeyService();

class KeysManager {
	static create(c: Controller, keyMap: KeyBindingMap) {
		return new KeysManager(c, keyMap);
	}

	private constructor(
		private ctl: Controller,
		private keyMap: KeyBindingMap
	) {}

	updateKeys(newKeyMap: KeyBindingMap, isLocal: boolean) {
		// Optimistic update
		const notification = this.ctl.notify('Updating...', { duration: 3000 });
		this.ctl.keys.setDefaultKeys(newKeyMap, false);
		// Push to store
		return testKeyService
			.setGlobalKeys(newKeyMap)
			.then(() => {
				this.keyMap = newKeyMap;
				notification.updateMessage('It worked!', { duration: 3000 });
			})
			.catch((err) => {
				notification.updateMessage(err.message);
				// Revert optimistic update...
				this.ctl.keys.setDefaultKeys(this.keyMap, isLocal);
				throw err;
			});
	}
}

export const settingsUI = (c: Controller, back: () => void) => {
	c.setBackBinding(back);
	c.ui.setDefaultUI<MyDefaultUIValues>({
		menuHeader: 'Settings',
		exitAction: back
	});
	c.menu.setMenuItems([
		checkboxMenuItem({
			textContent: 'Toggle simulate error storing bindings',
			checked: testKeyService.simulateError,
			action: (c, checked) => {
				testKeyService.toggleSimulateError(checked);
			}
		}),
		menuItemWithIcon({
			id: 'global-keys',
			text: 'Set global default key bindings...',
			action: () => {
				const keyMap = c.keys.globalDefaultKeys;
				const km = KeysManager.create(c, keyMap);
				KeyBindingsController.create({
					controller: c,
					onChange: (newKeyMap) => km.updateKeys(newKeyMap, false),
					keyMap,
					local: false,
					back: () => {
						settingsUI(c, back);
					}
				});
			}
		}),
		menuItemWithIcon({
			id: 'local-keys',
			text: 'Set local default key bindings...',
			action: () => {
				const keyMap = c.keys.localDefaultKeys;
				const km = KeysManager.create(c, keyMap);
				KeyBindingsController.create({
					controller: c,
					onChange: (newKeyMap) => km.updateKeys(newKeyMap, true),
					keyMap,
					local: true,
					back: () => {
						settingsUI(c, back);
					}
				});
			}
		})
	]);
};
