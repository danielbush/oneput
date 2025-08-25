import type { Controller, KeyBindingMap } from '$lib/oneput/controller.js';
import {
	keybindingMenuItem,
	keyboardIcon,
	menuItemWithIcon,
	piIcon,
	xIcon
} from '$lib/demo/live/ui.js';
import type { OneputProps } from '$lib/oneput/lib.js';

const globalKeys: KeyBindingMap = {
	openMenu: {
		bindings: ['$mod+k'],
		description: 'Open Oneput menu...',
		action: (c) => {
			c.openMenu();
		}
	}
};

const localKeys: KeyBindingMap = {
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

const globalKeysMenu = (c: Controller) => ({
	menu: {
		items: Object.entries(globalKeys).map(([id, { description, bindings }]) =>
			keybindingMenuItem({
				id,
				text: description,
				bindings,
				action: () => {
					c.update(
						bindingsMenu(c, {
							actionId: id,
							description,
							bindings,
							local: false
						})
					);
				}
			})
		)
	}
});

const localKeysMenu = (c: Controller) => ({
	menu: {
		items: Object.entries(localKeys).map(([id, { description, bindings }]) =>
			keybindingMenuItem({
				id,
				text: description,
				bindings,
				action: () => {
					c.update(
						bindingsMenu(c, {
							actionId: id,
							description,
							bindings,
							local: true
						})
					);
				}
			})
		)
	}
});

/**
 * A menu for managing the key bindings for a given action.
 */
const bindingsMenu = (
	c: Controller,
	{
		description,
		bindings,
		local,
		actionId
	}: {
		actionId: string;
		description: string;
		bindings: string[];
		local: boolean;
	}
) => ({
	menu: {
		header: {
			id: 'bindings-header',
			type: 'hflex',
			children: [
				{
					id: 'bindings-header-icon',
					type: 'fchild',
					innerHTMLUnsafe: ''
				},
				{
					id: 'bindings-header-text',
					type: 'fchild',
					textContent: `Key bindings for "${description}"`
				},
				{
					id: 'bindings-header-close',
					type: 'fchild',
					innerHTMLUnsafe: ''
				}
			]
		},
		items: [
			menuItemWithIcon({
				id: 'add-binding',
				text: 'Add binding...',
				action: () => {
					//
				}
			}),
			...bindings.map((binding) => {
				return menuItemWithIcon({
					id: binding,
					text: binding,
					leftIcon: keyboardIcon,
					rightIcon: xIcon,
					action: () => {
						const yes = confirm('Remove binding?');
						if (yes) {
							const keyMap = local ? localKeys : globalKeys;
							keyMap[actionId].bindings = keyMap[actionId].bindings.filter((b) => b !== binding);
							c.update(local ? { localKeys: keyMap } : { globalKeys: keyMap });
							c.update(
								bindingsMenu(c, {
									actionId,
									description,
									bindings: keyMap[actionId].bindings,
									local: true
								})
							);
						}
					}
				});
			})
		]
	} satisfies OneputProps['menu']
});

// Our app starts in this callback.  We get the controller and we can set
// keys and configure oneput.
export const setController = (c: Controller) => {
	c.update({
		globalKeys: globalKeys,
		localKeys: localKeys,
		// Setting input will show the input part of Oneput.
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
};
