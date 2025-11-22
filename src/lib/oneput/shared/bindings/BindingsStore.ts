import type { KeyBindingMapSerializable } from '$lib/oneput/bindings.js';
import type { ResultAsync } from 'neverthrow';

export interface BindingsStore {
	getKeys: (isLocal: boolean) => ResultAsync<KeyBindingMapSerializable, Error>;
	setKeys: (keyMap: KeyBindingMapSerializable, isLocal: boolean) => ResultAsync<string, Error>;
}
