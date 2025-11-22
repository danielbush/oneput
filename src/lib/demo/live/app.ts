import type { Controller } from '$lib/oneput/controller.js';
import { Layout } from './config/Layout.js';
import { LocalBindingsService } from '../../oneput/shared/bindings/LocalBindingsService.js';
import { RootUI } from './app/root.js';

// Our app starts in this callback.  We get the controller and we can set keys
// and configure oneput.
//
// Here we are relying on defaultUI to have some default settings including keys
// set for us.  But we could fetch settings asynchronously here, update
// defaultUI accordingly
export const setController = async (ctl: Controller) => {
	Layout.create(ctl).setLayout();
	LocalBindingsService.create(ctl).setDefaultBindings();
	ctl.runUI(RootUI);
};
