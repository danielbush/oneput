import type { Controller } from '$lib/oneput/controller.js';
import { registerIcons, lucide } from '$lib/oneput/lib/icons.js';
import { createElement, X } from 'lucide';
import { Layout } from './layout.js';
import { RootUI } from './app/root.js';

// Register all icons used by the app upfront.
// Using vanilla Lucide icons - createElement returns an SVG element.
registerIcons({
	// x: svg(xIcon) // legacy approach
	x: lucide(() => createElement(X))
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
