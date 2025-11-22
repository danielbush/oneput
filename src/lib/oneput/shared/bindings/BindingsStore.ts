import type { KeyBindingMapSerializable } from '../../bindings.js';
import type { ResultAsync } from 'neverthrow';

export interface BindingsStore {
	getBindings: (isLocal: boolean) => ResultAsync<KeyBindingMapSerializable, Error>;
	updateBindings: (
		keyMap: KeyBindingMapSerializable,
		isLocal: boolean
	) => ResultAsync<string, Error>;
}
