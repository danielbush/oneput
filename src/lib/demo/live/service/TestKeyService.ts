import type { KeyBindingMap } from '$lib/oneput/KeyBinding.js';

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
