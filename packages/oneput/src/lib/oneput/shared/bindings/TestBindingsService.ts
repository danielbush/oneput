import { BindingsStoreError, type BindingsEditorStore } from './BindingsEditorStore.js';
import { simulateDelay } from '../simulateDelay.js';
import { errAsync } from 'neverthrow';

/**
 * A test store that simulates a delay then always fails.
 *
 * Use this for demos — it never persists bindings.
 */
export class TestBindingsService implements BindingsEditorStore {
  static create() {
    return new TestBindingsService();
  }

  private constructor() {}

  updateBindings = () =>
    simulateDelay(1000).andThen(() =>
      errAsync(new BindingsStoreError('Simulated error: bindings not persisted'))
    );
}
