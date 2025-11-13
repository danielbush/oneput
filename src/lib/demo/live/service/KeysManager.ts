import type { Controller } from '$lib/oneput/controller.js';
import type { KeyBindingMap } from '$lib/oneput/KeyBinding.js';
import { KeyBindingsUI } from '$lib/oneput/plugins/menu/KeyBindingsUI.js';
import type { MyDefaultUI } from '../config/ui.js';
import { TestKeyService } from './TestKeyService.js';

/**
 * Combines the ui (KeyBindingsUI) with the storage (TestKeyService) to
 * let you manage your key bindings..
 */
export class KeysManagerFactory {
	static create(ctl: Controller, back: () => void) {
		return new KeysManagerFactory(ctl, back);
	}

	private constructor(
		private ctl: Controller,
		private back: () => void
	) {}

	create = (isLocal: boolean, keyMap: KeyBindingMap) => {
		const km: KeysManager = new KeysManager(
			this.ctl,
			TestKeyService.create(),
			isLocal,
			KeyBindingsUI.create({
				controller: this.ctl,
				back: this.back,
				onChange: (newKeyMap) => km.updateKeys(newKeyMap)
			}),
			keyMap
		);
		return km;
	};
}

/**
 * Instantiate to manage updates to a single set of keys eg local or global bindings.
 */
export class KeysManager {
	constructor(
		private ctl: Controller,
		private testKeyService: TestKeyService,
		private isLocal: boolean,
		private keyBindingsUI: KeyBindingsUI,
		private keyMap: KeyBindingMap = {}
	) {}

	runUI() {
		this.keyBindingsUI.runUI(this.keyMap);
	}

	async updateKeys(newKeyMap: KeyBindingMap) {
		// Optimistic update
		// For this demo, we'll just set the keys straight away and update the
		// default ui.  In more complicated setups you might be setting bindings
		// for a particular mode.
		const notification = this.ctl.notify('Updating...', { duration: 3000 });
		this.ctl.keys.setDefaultKeys(newKeyMap, this.isLocal);
		this.ctl.ui.getDefaultUI<MyDefaultUI>()?.keys.setDefaultKeys(newKeyMap, this.isLocal);
		// Push to store
		try {
			await this.testKeyService.setKeys(newKeyMap, this.isLocal);
			this.keyMap = newKeyMap;
			notification.updateMessage('Key bindings saved', { duration: 3000 });
		} catch (err) {
			notification.updateMessage((err as Error).message);
			// Revert optimistic update...
			this.ctl.keys.setDefaultKeys(this.keyMap, this.isLocal);
			this.ctl.ui.getDefaultUI<MyDefaultUI>()?.keys.setDefaultKeys(this.keyMap, this.isLocal);
			throw err;
		}
	}
}
