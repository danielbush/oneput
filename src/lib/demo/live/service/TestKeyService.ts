import type { KeyBindingMap } from '$lib/oneput/KeysController.js';

export class TestKeyService {
	simulateError = false;
	setGlobalKeys = async (keyMap: KeyBindingMap) => {
		return new Promise((resolve, reject) => {
			setTimeout(() => {
				if (this.simulateError) {
					reject(new Error('Simulate error'));
				}
				resolve(keyMap);
			}, 1000);
		});
	};
	setLocalKeys = async (keyMap: KeyBindingMap) => {
		return new Promise((resolve, reject) => {
			if (this.simulateError) {
				reject(new Error('Simulate error'));
			}
			setTimeout(() => {
				resolve(keyMap);
			}, 1000);
		});
	};
	toggleSimulateError = (on: boolean) => {
		this.simulateError = on;
		console.log('simulate error when storing keybindings set to', on);
	};
}
