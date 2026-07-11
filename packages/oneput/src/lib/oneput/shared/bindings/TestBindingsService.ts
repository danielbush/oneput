import { simulateDelay } from '../simulateDelay.js';
import { errAsync } from 'neverthrow';
import { BindingsStoreError, type BindingsStore } from './BindingsStore.js';

/**
 * A test store that simulates a delay then always fails.
 *
 * Use this for demos — it never persists bindings.
 */
export class TestBindingsService implements BindingsStore {
  static create() {
    return new TestBindingsService();
  }

  private constructor() {}

  getBindings = () =>
    simulateDelay(1000).andThen(() =>
      errAsync(new BindingsStoreError('Simulated error: bindings not loaded'))
    );

  updateBindings = () =>
    simulateDelay(1000).andThen(() =>
      errAsync(new BindingsStoreError('Simulated error: bindings not persisted'))
    );
}
