import { KeyEventBindings, type KeyBindingMapSerializable } from '../../lib/bindings.js';
import type { Controller } from '../../controllers/controller.js';
import { BindingsIDB } from './BindingsIDB.js';
import { BindingsStoreError, type BindingsEditorStore } from './BindingsEditorStore.js';
import { OneputCatalog } from '../actions/OneputCatalog.js';

/**
 * Persists bindings in IndexedDB.
 *
 * Implements {@link BindingsEditorStore} for use with BindingsEditor.
 * Also provides getBindings for loading persisted bindings at startup.
 */
export class LocalBindingsService implements BindingsEditorStore {
  static create(ctl: Controller) {
    const bindingsStore = BindingsIDB.create();
    return new LocalBindingsService(ctl, bindingsStore);
  }

  constructor(
    private ctl: Controller,
    private bindingsStore: BindingsIDB
  ) {}

  getBindings() {
    return this.bindingsStore
      .getBindings()
      .map((userBindings) => {
        const bindings = KeyEventBindings.create(OneputCatalog.create(this.ctl).getBindings());
        return bindings.applyBindings(userBindings).keyBindingMap;
      })
      .orTee((err) => this.ctl.notify(`Error getting keys: ${err.message}`));
  }

  updateBindings = (keyMap: KeyBindingMapSerializable) =>
    this.bindingsStore
      .updateBindings(keyMap)
      .mapErr((err) => new BindingsStoreError(err.message, { cause: err }));
}
