import type { Controller } from '$lib/oneput/controller.js';
import { MyDefaultUI } from './config/defaultUI.js';
import { RootUI } from './app/root.js';
import {
	defaultGlobalActions,
	defaultGlobalBindings,
	defaultLocalActions,
	defaultLocalBindings
} from '../../oneput/shared/defaultBindings.js';
import { keyBindingMapFromSerializable } from '$lib/oneput/bindings.js';
import { BindingsIDB } from '$lib/oneput/shared/BindingsIDB.js';

// Our app starts in this callback.  We get the controller and we can set keys
// and configure oneput.
//
// Here we are relying on defaultUI to have some default settings including keys
// set for us.  But we could fetch settings asynchronously here, update
// defaultUI accordingly
export const setController = async (ctl: Controller) => {
	ctl.ui.setDefaultUI(MyDefaultUI.create(ctl));
	const bindingsStore = BindingsIDB.create();
	bindingsStore
		.getKeys(false, defaultGlobalBindings)
		.map((kbMapSerializable) => {
			console.log('getting global keys', kbMapSerializable);
			const keyBindingMap = keyBindingMapFromSerializable(kbMapSerializable, defaultGlobalActions);
			ctl.keys.setDefaultKeys(keyBindingMap, false);
		})
		.orTee((err) => ctl.notify(`Error getting global keys: ${err.message}`));
	bindingsStore
		.getKeys(true, defaultLocalBindings)
		.map((kbMapSerializable) => {
			console.log('getting local keys', kbMapSerializable);
			const keyBindingMap = keyBindingMapFromSerializable(kbMapSerializable, defaultLocalActions);
			ctl.keys.setDefaultKeys(keyBindingMap, true);
		})
		.orTee((err) => ctl.notify(`Error getting local keys: ${err.message}`));
	ctl.runUI(RootUI);
};
