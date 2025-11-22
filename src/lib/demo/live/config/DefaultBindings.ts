import { KeyEventBindings } from '$lib/oneput/bindings.js';
import type { Controller } from '$lib/oneput/controller.js';
import { BindingsIDB } from '$lib/oneput/shared/bindings/BindingsIDB.js';
import {
	defaultGlobalBindings,
	defaultGlobalActions,
	defaultLocalBindings,
	defaultLocalActions
} from '$lib/oneput/shared/bindings/defaultBindings.js';

export class DefaultBindings {
	static create(ctl: Controller) {
		const bindingsStore = BindingsIDB.create();
		return new DefaultBindings(ctl, bindingsStore);
	}

	constructor(
		private ctl: Controller,
		private bindingsStore: BindingsIDB
	) {}

	async setDefaultBindings() {
		this.bindingsStore
			.getKeys(false, defaultGlobalBindings)
			.map((kbMapSerializable) => {
				console.log('getting global keys', kbMapSerializable);
				const keyBindingMap = KeyEventBindings.fromSerializable(
					kbMapSerializable,
					defaultGlobalActions
				).keyBindingMap;
				this.ctl.keys.setDefaultKeys(keyBindingMap, false);
			})
			.orTee((err) => this.ctl.notify(`Error getting global keys: ${err.message}`));
		this.bindingsStore
			.getKeys(true, defaultLocalBindings)
			.map((kbMapSerializable) => {
				console.log('getting local keys', kbMapSerializable);
				const keyBindingMap = KeyEventBindings.fromSerializable(
					kbMapSerializable,
					defaultLocalActions
				).keyBindingMap;
				this.ctl.keys.setDefaultKeys(keyBindingMap, true);
			})
			.orTee((err) => this.ctl.notify(`Error getting local keys: ${err.message}`));
	}
}
