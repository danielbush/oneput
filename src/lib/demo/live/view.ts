import type { Controller, KeyBindingMap } from '$lib/oneput/controller.js';
import { keybindingMenuItem, menuItemWithIcon, piIcon } from '$lib/ui.js';
import { KeyBindingsController } from '$lib/plugins/bindings/mod.js';
import { configureBindingsForActionMenu } from '$lib/plugins/bindings/ui.js';
import { id } from '$lib/oneput/lib.js';

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
				id: 'settings',
				text: 'Settings...',
				action: () => {
					c.update(settingsMenu(c));
				}
			}),
			menuItemWithIcon({
				id: 'navigate-outline',
				text: 'Navigate outline...',
				action: () => {
					const headings = Array.from(document.querySelectorAll('h1,h2,h3,h4,h5,h6'));
					c.update({
						menu: {
							items: headings.map((h) => ({
								id: id(),
								tag: 'button',
								type: 'hflex',
								children: [
									{
										id: id(),
										classes: ['oneput__menu-item-body'],
										type: 'fchild',
										textContent: h.textContent
									}
								],
								action: () => {
									h.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
									c.closeMenu();
								}
							}))
						}
					});
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

const settingsMenu = (c: Controller) => ({
	menu: {
		items: [
			menuItemWithIcon({
				id: 'global-keys',
				text: 'Set global key bindings...',
				action: () => {
					const handler = new KeyBindingsController(
						c,
						globalKeys,
						false,
						keybindingMenuItem,
						configureBindingsForActionMenu
					);
					c.update(handler.keysMenu);
				}
			}),
			menuItemWithIcon({
				id: 'local-keys',
				text: 'Set local key bindings...',
				action: () => {
					const handler = new KeyBindingsController(
						c,
						localKeys,
						true,
						keybindingMenuItem,
						configureBindingsForActionMenu
					);
					c.update(handler.keysMenu);
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
