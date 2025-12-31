import type { Controller } from '$lib/oneput/controller.js';
import { registerIcons, lucide } from '$lib/oneput/lib/icons.js';
import { createElement } from 'lucide';
import * as icons from 'lucide';
import { Layout } from './layout.js';
import { RootUI } from './app/root.js';

// Register all icons used by the app upfront.
// Using vanilla Lucide icons - createElement returns an SVG element.
registerIcons({
	x: lucide(() => createElement(icons.X))
	// x: svg('<svg ...></svg>') // legacy approach
	// x: {
	// 	type: 'element',
	// 	create: () => {
	// 		const el = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
	// 		el.setAttribute('width', '24');
	// 		el.setAttribute('height', '24');
	// 		el.setAttribute('viewBox', '0 0 24 24');
	// 		el.setAttribute('fill', 'none');
	// 		el.setAttribute('stroke', 'currentColor');
	// 		el.setAttribute('stroke-width', '2');
	// 		el.setAttribute('stroke-linecap', 'round');
	// 		el.setAttribute('stroke-linejoin', 'round');
	// 		el.setAttribute('class', 'lucide lucide-x-icon lucide-x');
	// 		el.innerHTML = '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>';
	// 		return el;
	// 	}
	// }
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
