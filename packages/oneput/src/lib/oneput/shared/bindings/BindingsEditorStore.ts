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

export type BindingsEditorStoreError = BindingsStoreError;

/**
 * Minimal store interface for persisting bindings.
 *
 * Implemented by LocalBindingsService, TestBindingsService, or any store
 * that can persist a serializable key-binding map.
 */
export interface BindingsEditorStore {
  updateBindings(keyMap: KeyBindingMapSerializable): ResultAsync<string, BindingsEditorStoreError>;
}
