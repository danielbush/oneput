import type { KeyBindingMap } from '$lib/oneput/KeysController.js';

export const testKeyService = {
	simulateError: false,
	setGlobalKeys: async (keyMap: KeyBindingMap) => {
		return new Promise((resolve, reject) => {
			setTimeout(() => {
				if (testKeyService.simulateError) {
					reject(new Error('Simulate error'));
				}
				resolve(keyMap);
			}, 1000);
		});
	},
	setLocalKeys: async (keyMap: KeyBindingMap) => {
		return new Promise((resolve, reject) => {
			if (testKeyService.simulateError) {
				reject(new Error('Simulate error'));
			}
			setTimeout(() => {
				resolve(keyMap);
			}, 1000);
		});
	},
	toggleSimulateError: (on: boolean) => {
		testKeyService.simulateError = on;
		console.log('simulate error when storing keybindings set to', on);
	}
};
