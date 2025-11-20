import type { KeyBindingMapSerializable } from '$lib/oneput/bindings.js';
import { BindingsIDB, type BindingsStore } from '$lib/oneput/shared/BindingsIDB.js';
import { simulateDelay } from '$lib/oneput/shared/simulateDelay.js';
import { maybeSimulateError } from '$lib/oneput/shared/simulateError.js';

export const config = {
	simulateError: false,
	toggleSimulateError: (on: boolean) => {
		config.simulateError = on;
		console.log('simulate error when storing keybindings set to', on);
	}
};

/**
 * Simulates delays and errors for live demos; on success stores bindings in
 * oneput's binding idb store.
 */
export class TestBindingsStore implements BindingsStore {
	static create() {
		return new TestBindingsStore(BindingsIDB.create());
	}

	private constructor(private db: BindingsIDB) {}

	getKeys = (isLocal: boolean) => {
		return this.db.getKeys(isLocal);
	};

	setKeys = (keyMap: KeyBindingMapSerializable, isLocal: boolean) => {
		const msg = `A simulated error occurred for setKeys: ${isLocal ? 'local' : 'global'} key bindings`;
		return simulateDelay(1000)
			.andThen(() => maybeSimulateError(config.simulateError, msg, 'TestKeyService'))
			.andThen(() => this.db.setKeys(keyMap, isLocal));
	};
}
