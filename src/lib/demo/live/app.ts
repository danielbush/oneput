import type { Controller } from '$lib/oneput/controller.js';
import { MyDefaultUI } from './config/ui.js';
import { RootUI } from './app/root.js';
import { globalKeys } from './config/keys.js';
import { localKeys } from './config/keys.js';

// Our app starts in this callback.  We get the controller and we can set
// keys and configure oneput.
export const setController = (c: Controller) => {
	const ui = new MyDefaultUI(c);
	c.ui.setDefaultUI(ui);
	c.keys.setDefaultKeys(globalKeys);
	c.keys.setDefaultKeys(localKeys, true);
	RootUI.create(c).run();
};
