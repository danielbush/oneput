import type { Controller } from '$lib/oneput/controller.js';
import { MyDefaultUI } from './config/ui.js';
import { rootUI } from './app/root.js';
import { globalKeys } from './config/keys.js';
import { localKeys } from './config/keys.js';

// Our app starts in this callback.  We get the controller and we can set
// keys and configure oneput.
export const setController = (c: Controller) => {
	c.keys.setKeys(globalKeys);
	c.keys.setKeys(localKeys, true);
	const ui = new MyDefaultUI(c);
	c.ui.configureDefaultUI(ui);
	rootUI(c);
};
