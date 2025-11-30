import type { KeyBindingMapSerializable } from '../../../oneput/lib/bindings.js';
import { BindingsIDB } from '../../../oneput/shared/bindings/BindingsIDB.js';
import type { BindingsStore } from '../../../oneput/shared/bindings/BindingsStore.js';
import { simulateDelay } from '../../../oneput/shared/simulateDelay.js';
import { maybeSimulateError } from '../../../oneput/shared/simulateError.js';

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

	getBindings = (isLocal: boolean) => {
		return this.db.getBindings(isLocal);
	};

	updateBindings = (keyMap: KeyBindingMapSerializable, isLocal: boolean) => {
		const msg = `A simulated error occurred for setKeys: ${isLocal ? 'local' : 'global'} key bindings`;
		return simulateDelay(1000)
			.andThen(() => maybeSimulateError(config.simulateError, msg, 'TestKeyService'))
			.andThen(() => this.db.updateBindings(keyMap, isLocal));
	};
}
