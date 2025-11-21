import type { Controller } from '$lib/oneput/controller.js';
import { DefaultBindings, MyDefaultUI } from './config/defaultUI.js';
import { RootUI } from './app/root.js';

// Our app starts in this callback.  We get the controller and we can set keys
// and configure oneput.
//
// Here we are relying on defaultUI to have some default settings including keys
// set for us.  But we could fetch settings asynchronously here, update
// defaultUI accordingly
export const setController = async (ctl: Controller) => {
	MyDefaultUI.create(ctl).setDefaultUI();
	DefaultBindings.create(ctl).setDefaultBindings();
	ctl.runUI(RootUI);
};
