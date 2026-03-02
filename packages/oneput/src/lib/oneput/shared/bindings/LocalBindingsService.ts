import { KeyEventBindings, type KeyBindingMap } from '../../lib/bindings.js';
import type { Controller } from '../../controllers/controller.js';
import { BindingsIDB } from './BindingsIDB.js';
import { defaultBindingsSerializable, defaultActions } from './defaultBindings.js';

/**
 * Stores bindings in indexeddb.
 */
export class LocalBindingsService {
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
      .getBindings(defaultBindingsSerializable)
      .map((kbMapSerializable) => {
        return KeyEventBindings.fromSerializable(kbMapSerializable, defaultActions).keyBindingMap;
      })
      .orTee((err) => this.ctl.notify(`Error getting keys: ${err.message}`));
  }

  update(keyBindingMap: KeyBindingMap) {
    const oldKeyBindingMap = keyBindingMap;

    this.ctl.keys.setDefaultBindings(keyBindingMap);

    const result = this.bindingsStore.updateBindings(
      KeyEventBindings.create(keyBindingMap).toSerializable()
    );
    result.orTee(() => {
      // Reset default bindings in event of error.
      // The caller of this method will show error message.
      this.ctl.keys.setDefaultBindings(oldKeyBindingMap);
    });
    return result;
  }
}
