import type { Controller } from '$lib/oneput/controller.js';
import type { KeyBindingMap } from '$lib/oneput/KeysController.js';
import { KeyBindingsController } from '$lib/oneput/plugins/menu/editBindings.js';
import { TestKeyService } from './TestKeyService.js';

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

	updateKeys(newKeyMap: KeyBindingMap) {
		// Optimistic update
		const notification = this.ctl.notify('Updating...', { duration: 3000 });
		this.ctl.keys.setDefaultKeys(newKeyMap, this.isLocal);
		// Push to store
		return this.testKeyService
			.setKeys(newKeyMap, this.isLocal)
			.then(() => {
				this.keyMap = newKeyMap;
				notification.updateMessage('It worked!', { duration: 3000 });
			})
			.catch((err) => {
				notification.updateMessage(err.message);
				// Revert optimistic update...
				this.ctl.keys.setDefaultKeys(this.keyMap, this.isLocal);
				throw err;
			});
	}
}
