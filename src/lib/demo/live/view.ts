import type { Controller, KeyBindingMap } from '$lib/oneput/controller.js';
import { menuItemWithIcon, piIcon } from '$lib/ui.js';
import { keysMenu } from '$lib/plugins/bindings.js';

export const globalKeys: KeyBindingMap = {
	openMenu: {
		bindings: ['$mod+k'],
		description: 'Open Oneput menu...',
		action: (c) => {
			c.openMenu();
		}
	}
};

export const localKeys: KeyBindingMap = {
	doAction: {
		bindings: ['Enter'],
		action: (c) => {
			c.doAction();
		},
		description: 'Do action'
	},
	closeMenu: {
		bindings: ['Escape', 'Control+['],
		description: 'Close menu',
		action: (c) => {
			c.closeMenu();
		}
	},
	focusPreviousMenuItem: {
		bindings: ['$mod+k'],
		description: 'Focus previous menu item',
		action: (c) => {
			c.focusPreviousMenuItem();
		}
	},
	focusNextMenuItem: {
		bindings: ['$mod+j'],
		description: 'Focus next menu item',
		action: (c) => {
			c.focusNextMenuItem();
		}
	}
};

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
				text: 'Set global key bindings...',
				action: () => {
					c.update(keysMenu(c, { local: false, keyMap: globalKeys }));
				}
			}),
			menuItemWithIcon({
				id: 'local-keys',
				text: 'Set local key bindings...',
				action: () => {
					c.update(keysMenu(c, { local: true, keyMap: localKeys }));
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
