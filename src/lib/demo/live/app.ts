import type { Controller } from '$lib/oneput/controller.js';
import { MyDefaultUI } from './config/ui.js';
import { RootUI } from './app/root.js';
import type { MenuItemAny } from '$lib/oneput/lib.js';

function simpleFilter(input: string, menuItems: MenuItemAny[]) {
	return menuItems.filter((item) => {
		return item.children?.some((child) => {
			if (child.type === 'fchild') {
				return child.textContent?.toLowerCase().includes(input.toLowerCase());
			}
			return false;
		});
	});
}

// Our app starts in this callback.  We get the controller and we can set keys
// and configure oneput.
//
// Here we are relying on defaultUI to have some default settings including keys
// set for us.  But we could fetch settings asynchronously here, update
// defaultUI accordingly
export const setController = (ctl: Controller) => {
	const defaultUI = new MyDefaultUI(ctl);
	ctl.ui.setDefaultUI(defaultUI);
	ctl.keys.setKeys(defaultUI.keys.defaultGlobalKeys, false);
	ctl.keys.setKeys(defaultUI.keys.defaultLocalKeys, true);
	ctl.menu.setDefaultMenuItemsFn(simpleFilter);
	RootUI.create(ctl).run();
};
