import type { Controller } from '$lib/oneput/controller.js';
import type { KeyBindingMap } from '$lib/oneput/KeyBinding.js';
import { KeyBindingsController } from '$lib/oneput/plugins/menu/KeyBindingsController.js';
import type { MyDefaultUI } from '../config/ui.js';
import { TestKeyService } from './TestKeyService.js';

/**
 * Combines the ui (KeyBindingsController) with the storage (TestKeyService) to
 * let you manage your key bindings..
 */
export class KeysManager {
	static create(c: Controller, keyMap: KeyBindingMap, isLocal: boolean) {
		const testKeyService = TestKeyService.create();
		return new KeysManager(c, keyMap, testKeyService, isLocal, KeyBindingsController.create);
	}

	private constructor(
		private ctl: Controller,
		private keyMap: KeyBindingMap,
		private testKeyService: TestKeyService,
		private isLocal: boolean,
		private createKeyBindingsController: (params: {
			controller: Controller;
			onChange: (newKeyMap: KeyBindingMap) => Promise<void>;
			keyMap: KeyBindingMap;
			local: boolean;
			back: () => void;
		}) => KeyBindingsController
	) {
		this.createKeyBindingsController = createKeyBindingsController;
	}

	run(back: () => void) {
		this.createKeyBindingsController({
			controller: this.ctl,
			onChange: (newKeyMap) => this.updateKeys(newKeyMap),
			keyMap: this.keyMap,
			local: this.isLocal,
			back
		}).run();
	}

	async updateKeys(newKeyMap: KeyBindingMap) {
		// Optimistic update
		// For this demo, we'll just set the keys straight away and update the
		// default ui.  In more complicated setups you might be setting bindings
		// for a particular mode.
		const notification = this.ctl.notify('Updating...', { duration: 3000 });
		this.ctl.keys.setKeys(newKeyMap, this.isLocal);
		this.ctl.ui.getDefaultUI<MyDefaultUI>()?.keys.setDefaultKeys(newKeyMap, this.isLocal);
		// Push to store
		try {
			await this.testKeyService.setKeys(newKeyMap, this.isLocal);
			this.keyMap = newKeyMap;
			notification.updateMessage('It worked!', { duration: 3000 });
		} catch (err) {
			notification.updateMessage((err as Error).message);
			// Revert optimistic update...
			this.ctl.keys.setKeys(this.keyMap, this.isLocal);
			this.ctl.ui.getDefaultUI<MyDefaultUI>()?.keys.setDefaultKeys(this.keyMap, this.isLocal);
			throw err;
		}
	}
}
