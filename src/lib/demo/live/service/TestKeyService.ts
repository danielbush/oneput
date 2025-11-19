import type { KeyBindingMap } from '$lib/oneput/KeyBinding.js';
import { ResultAsync, ok, err } from 'neverthrow';

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
						err(
							new SimulatedError(
								'TestKeyService.getKeys',
								`A simulated error occurred for ${isLocal ? 'local' : 'global'} key bindings`
							)
						)
					);
				}
				resolve(isLocal ? this.localKeys : this.globalKeys);
			}, 1000);
		});
	};

	setKeys = (
		keyMap: KeyBindingMap,
		isLocal: boolean
	): ResultAsync<KeyBindingMap, SimulatedError> => {
		return ResultAsync.fromPromise(
			new Promise<KeyBindingMap>((resolve) => {
				setTimeout(() => {
					resolve(keyMap);
				}, 1000);
			}),
			() => new SimulatedError('unexpected', 'Unexpected error')
		).andThen((result) => {
			if (config.simulateError) {
				return err(
					new SimulatedError(
						'TestKeyService.setKeys',
						`A simulated error occurred for ${isLocal ? 'local' : 'global'} key bindings`
					)
				);
			}
			return ok(result);
		});
	};
}
