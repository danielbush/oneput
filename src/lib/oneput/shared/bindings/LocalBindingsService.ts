import { KeyEventBindings, type KeyBindingMap } from '../../lib/bindings.js';
import type { Controller } from '../../controller.js';
import { BindingsIDB } from './BindingsIDB.js';
import {
	defaultGlobalBindings,
	defaultGlobalActions,
	defaultLocalBindings,
	defaultLocalActions
} from './defaultBindings.js';
import { ResultAsync } from 'neverthrow';

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
		const globalBindings = this.bindingsStore
			.getBindings(false, defaultGlobalBindings)
			.map((kbMapSerializable) => {
				return KeyEventBindings.fromSerializable(kbMapSerializable, defaultGlobalActions)
					.keyBindingMap;
			})
			.orTee((err) => this.ctl.notify(`Error getting global keys: ${err.message}`));
		const localBindings = this.bindingsStore
			.getBindings(true, defaultLocalBindings)
			.map((kbMapSerializable) => {
				return KeyEventBindings.fromSerializable(kbMapSerializable, defaultLocalActions)
					.keyBindingMap;
			})
			.orTee((err) => this.ctl.notify(`Error getting local keys: ${err.message}`));
		return ResultAsync.combine([globalBindings, localBindings]).map(
			([globalBindings, localBindings]) => {
				return {
					globalBindings,
					localBindings
				};
			}
		);
	}

	update(keyBindingMap: KeyBindingMap, isLocal: boolean) {
		const oldKeyBindingMap = keyBindingMap;

		this.ctl.keys.setDefaultBindings(keyBindingMap, isLocal);

		const result = this.bindingsStore.updateBindings(
			KeyEventBindings.create(keyBindingMap).toSerializable(),
			isLocal
		);
		result.orTee(() => {
			// Reset default bindings in event of error.
			// The caller of this method will show error message.
			this.ctl.keys.setDefaultBindings(oldKeyBindingMap, isLocal);
		});
		return result;
	}
}
