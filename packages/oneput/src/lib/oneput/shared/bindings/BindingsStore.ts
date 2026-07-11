import type { KeyBindingMapSerializable } from '../../lib/bindings.js';
import type { ResultAsync } from 'neverthrow';

/**
 * Persistence failed (wraps infrastructure errors like IDB failures).
 */
export class BindingsStoreError extends Error {
  readonly _tag = 'BindingsStoreError' as const;
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
  }
}

export interface BindingsStore {
  getBindings: () => ResultAsync<KeyBindingMapSerializable, Error>;
  updateBindings: (keyMap: KeyBindingMapSerializable) => ResultAsync<string, Error>;
}
