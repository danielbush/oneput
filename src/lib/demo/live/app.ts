import type { Controller } from '$lib/oneput/controller.js';
import { registerIcons, svg } from '$lib/oneput/lib/icons.js';
import { xIcon } from '$lib/oneput/shared/icons.js';
import { Layout } from './layout.js';
import { RootUI } from './app/root.js';

// Register all icons used by the app upfront.
// This uses the legacy SVG strings from icons.ts, but you can also use:
// - lucide(X) for Lucide icons
// - { type: 'element', create: () => yourElement } for custom factories
registerIcons({
	x: svg(xIcon)
});

// Our app starts in this callback.  We get the controller and we can set keys
// and configure oneput.  See src/routes/demo/live/+layout.svelte for the entry point.
//
// Layout manages a number ofdefault settings.
// But we could fetch settings asynchronously here and set defaults here also.
export const setController = (ctl: Controller) => {
	ctl.ui.setLayout(Layout.create(ctl));
	ctl.app.run(RootUI.create(ctl));
};
