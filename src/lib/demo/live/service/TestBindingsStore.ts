import type { KeyBindingMap } from '$lib/oneput/KeyBinding.js';
import { BindingsIDB } from '$lib/oneput/shared/BindingsIDB.js';
import { ok, Result, ResultAsync } from 'neverthrow';

export class SimulatedError extends Error {
	constructor(
		public service: string,
		message: string
	) {
		super(message);
		this.name = 'SimulatedError';
	}
}

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
export class TestBindingsStore {
	static create() {
		return new TestBindingsStore(BindingsIDB.create());
	}

	private constructor(private db: BindingsIDB) {}

	getKeys = (isLocal: boolean) => {
		return this.db.getKeys(isLocal);
	};

	setKeys = (keyMap: KeyBindingMap, isLocal: boolean) => {
		const msg = `A simulated error occurred for setKeys: ${isLocal ? 'local' : 'global'} key bindings`;
		return simulateDelay(1000)
			.andThen(() => maybeSimulateError(msg, 'TestKeyService'))
			.andThen(() => this.db.setKeys(keyMap, isLocal));
	};
}

const maybeSimulateError = Result.fromThrowable(
	(msg: string, service: string) => {
		if (config.simulateError) {
			throw new SimulatedError(service, msg);
		}
		return ok();
	},
	(error) => error as SimulatedError
);

const simulateDelay = (ms: number = 1000) =>
	ResultAsync.fromSafePromise(
		new Promise<void>((resolve) => {
			setTimeout(() => {
				resolve(void 0);
			}, ms);
		})
	);
