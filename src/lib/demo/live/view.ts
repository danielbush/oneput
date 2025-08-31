import type { Controller, KeyBindingMap } from '$lib/oneput/controller.js';
import { menuItemWithIcon, piIcon } from '$lib/ui.js';
import { KeyBindingsController } from '$lib/plugins/bindings/mod.js';
import { NavigateHeadings } from './NavigateHeadings.js';

export const globalKeys: KeyBindingMap = {
	openMenu: {
		bindings: ['$mod+Shift+k'],
		description: 'Open Oneput menu...',
		action: (c) => {
			c.openMenu();
		}
	},
	focusInput: {
		bindings: ['$mod+[', 'Control+['],
		action: (c) => {
			c.focusInput();
		},
		description: 'Focus input'
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
	focusInput: {
		bindings: ['$mod+[', 'Control+['],
		action: (c) => {
			c.focusInput();
		},
		description: 'Focus input'
	},
	closeMenu: {
		bindings: ['Escape', '$mod+Shift+k'],
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

const rootUI = (c: Controller) => ({
	input: {},
	menu: {
		items: [
			menuItemWithIcon({
				id: 'settings',
				text: 'Settings...',
				action: () => {
					c.update(settingsUI(c));
				}
			}),
			menuItemWithIcon({
				id: 'navigate-outline',
				text: 'Navigate outline...',
				action: () => {
					NavigateHeadings.create(c, document);
				}
			}),
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
			})
		]
	}
});

const settingsUI = (c: Controller) => ({
	menu: {
		items: [
			menuItemWithIcon({
				id: 'global-keys',
				text: 'Set global key bindings...',
				action: () => {
					KeyBindingsController.create(c, globalKeys, false);
				}
			}),
			menuItemWithIcon({
				id: 'local-keys',
				text: 'Set local key bindings...',
				action: () => {
					KeyBindingsController.create(c, localKeys, true);
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
		...rootUI(c)
	});
};
