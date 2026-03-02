import type { KeyBindingMapSerializable } from '../../lib/bindings.js';
import type { ResultAsync } from 'neverthrow';

export interface BindingsStore {
  getBindings: () => ResultAsync<KeyBindingMapSerializable, Error>;
  updateBindings: (keyMap: KeyBindingMapSerializable) => ResultAsync<string, Error>;
}
