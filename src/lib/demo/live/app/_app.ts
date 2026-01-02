import type { Controller } from '$lib/oneput/controller.js';
import { Layout } from './_layout.js';
import { RootUI } from './root.js';

// Our app starts in this callback.  We get the controller and we can set keys
// and configure oneput.  See src/routes/demo/live/+layout.svelte for the entry point.
//
// Layout manages a number ofdefault settings.
// But we could fetch settings asynchronously here and set defaults here also.
export const setController = (ctl: Controller) => {
	ctl.ui.setLayout(Layout.create(ctl));
	ctl.app.run(RootUI.create(ctl));
};
