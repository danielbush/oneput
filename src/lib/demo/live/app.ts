import type { Controller } from '$lib/oneput/controller.js';
import { Layout } from './layout.js';
import { LocalBindingsService } from '../../oneput/shared/bindings/LocalBindingsService.js';
import { RootUI } from './app/root.js';
import { WordFilter } from '$lib/oneput/shared/filters/WordFilter.js';

// Our app starts in this callback.  We get the controller and we can set keys
// and configure oneput.
//
// Here we are relying on defaultUI to have some default settings including keys
// set for us.  But we could fetch settings asynchronously here, update
// defaultUI accordingly
export const setController = (ctl: Controller) => {
	ctl.ui.setLayout(Layout.create(ctl));
	ctl.menu.setDefaultMenuItemsFn(WordFilter.create().menuItemsFn);
	ctl.menu.setDefaultFocusBehaviour('first');
	ctl.input.setDefaultPlaceholder('Type here...');
	LocalBindingsService.create(ctl)
		.getBindings()
		.map((bindings) => {
			ctl.keys.setDefaultBindings(bindings.globalBindings, false, true);
			ctl.keys.setDefaultBindings(bindings.localBindings, true, true);
		});
	ctl.runUI(RootUI);
};
