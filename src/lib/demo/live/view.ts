import type { Controller } from '$lib/oneput/controller.js';
import { menuItemWithIcon, piIcon } from '$lib/ui.js';
import { globalKeys, globalKeysMenu, localKeys, localKeysMenu } from '$lib/plugins/bindings.js';

const rootMenu = (c: Controller) => ({
	input: {},
	menu: {
		items: [
			menuItemWithIcon({
				id: 'insert-katex',
				leftIcon: piIcon,
				text: 'Insert katex...',
				action: () => {
					console.log('insert katex');
				}
			}),
			menuItemWithIcon({
				id: 'close-menu',
				text: 'Close menu',
				action: () => {
					c.closeMenu();
				}
			}),
			menuItemWithIcon({
				id: 'settings',
				text: 'Settings...',
				action: () => {
					c.update(settingsMenu(c));
				}
			}),
			menuItemWithIcon({
				id: 'some-action-3',
				text: 'Some action 3...',
				action: () => {
					console.log('some action 3');
				}
			})
		]
	}
});

const settingsMenu = (c: Controller) => ({
	menu: {
		items: [
			menuItemWithIcon({
				id: 'global-keys',
				text: 'Set global key-bindings...',
				action: () => {
					c.update(globalKeysMenu(c));
				}
			}),
			menuItemWithIcon({
				id: 'local-keys',
				text: 'Set local key-bindings...',
				action: () => {
					c.update(localKeysMenu(c));
				}
			})
		]
	}
});

// Our app starts in this callback.  We get the controller and we can set
// keys and configure oneput.
export const setController = (c: Controller) => {
	c.update({
		globalKeys: globalKeys,
		localKeys: localKeys,
		// Setting input will show the input part of Oneput.
		...rootMenu(c)
	});
};
