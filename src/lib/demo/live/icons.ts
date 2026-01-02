import { registerIcons, lucide } from '$lib/oneput/lib/icons.js';
import { createElement } from 'lucide';
import * as icons from 'lucide';

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
