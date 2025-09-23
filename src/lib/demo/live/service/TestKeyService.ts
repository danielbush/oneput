import type { KeyBindingMap } from '$lib/oneput/KeysController.js';

export const config = {
	simulateError: false,
	toggleSimulateError: (on: boolean) => {
		config.simulateError = on;
		console.log('simulate error when storing keybindings set to', on);
	}
};

export class TestKeyService {
	static create() {
		return new TestKeyService();
	}

	setGlobalKeys = async (keyMap: KeyBindingMap) => {
		return new Promise((resolve, reject) => {
			setTimeout(() => {
				if (config.simulateError) {
					reject(new Error('Simulate error'));
				}
				resolve(keyMap);
			}, 1000);
		});
	};
	setLocalKeys = async (keyMap: KeyBindingMap) => {
		return new Promise((resolve, reject) => {
			if (config.simulateError) {
				reject(new Error('Simulate error'));
			}
			setTimeout(() => {
				resolve(keyMap);
			}, 1000);
		});
	};
}
