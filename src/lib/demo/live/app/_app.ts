import type { Controller } from '$lib/oneput/controller.js';
import { registerIcons, lucide } from '$lib/oneput/lib/icons.js';
import { createElement } from 'lucide';
import * as icons from 'lucide';
import { Layout } from './_layout.js';
import { RootUI } from './root.js';

// Register all icons used by the app upfront.
// Using vanilla Lucide icons - createElement returns an SVG element.
//
// Alternative strategies:
//   svg('<svg>...</svg>')              - raw SVG string
//   element(() => myElement)           - any element factory
//   (target) => { ... }                - inline custom renderer
registerIcons({
	x: lucide(() => createElement(icons.X)),
	settings: lucide(() => createElement(icons.Settings)),
	keyboard: lucide(() => createElement(icons.Keyboard)),
	chevronRight: lucide(() => createElement(icons.ChevronRight)),
	tick: lucide(() => createElement(icons.Check)),
	squareFunction: lucide(() => createElement(icons.SquareFunction)),
	arrowLeft: lucide(() => createElement(icons.ArrowLeft)),
	sigma: lucide(() => createElement(icons.Sigma))
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
