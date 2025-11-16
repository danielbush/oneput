import type { KeyBindingMap } from '$lib/oneput/KeyBinding.js';

export const config = {
	simulateError: false,
	toggleSimulateError: (on: boolean) => {
		config.simulateError = on;
		console.log('simulate error when storing keybindings set to', on);
	}
};

export type KeyService = TestKeyService;

export class TestKeyService {
	static create() {
		return new TestKeyService();
	}

	private localKeys: KeyBindingMap = {};
	private globalKeys: KeyBindingMap = {};

	getKeys = async (isLocal: boolean) => {
		return new Promise<KeyBindingMap>((resolve, reject) => {
			setTimeout(() => {
				if (config.simulateError) {
					reject(
						new Error(`A simulated error occurred for ${isLocal ? 'local' : 'global'} key bindings`)
					);
				}
				resolve(isLocal ? this.localKeys : this.globalKeys);
			}, 1000);
		});
	};

	setKeys = async (keyMap: KeyBindingMap, isLocal: boolean) => {
		return new Promise((resolve, reject) => {
			setTimeout(() => {
				if (config.simulateError) {
					reject(
						new Error(`A simulated error occurred for ${isLocal ? 'local' : 'global'} key bindings`)
					);
				}
				resolve(keyMap);
			}, 1000);
		});
	};
}
