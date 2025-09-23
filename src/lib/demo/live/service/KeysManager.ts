import type { Controller } from '$lib/oneput/controller.js';
import type { KeyBindingMap } from '$lib/oneput/KeysController.js';
import { TestKeyService } from './TestKeyService.js';

export class KeysManager {
	static create(c: Controller, keyMap: KeyBindingMap) {
		const testKeyService = TestKeyService.create();
		return new KeysManager(c, keyMap, testKeyService);
	}

	private constructor(
		private ctl: Controller,
		private keyMap: KeyBindingMap,
		private testKeyService: TestKeyService
	) {}

	updateKeys(newKeyMap: KeyBindingMap, isLocal: boolean) {
		// Optimistic update
		const notification = this.ctl.notify('Updating...', { duration: 3000 });
		this.ctl.keys.setDefaultKeys(newKeyMap, false);
		// Push to store
		return this.testKeyService
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
