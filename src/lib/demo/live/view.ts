import type { Controller, KeyBindingMap } from '$lib/oneput/controller.js';
import type { OneputProps } from '$lib/oneput/lib.js';
import {
	arrowLeftIcon,
	chevronDown,
	chevronUp,
	menuItemWithIcon,
	settingsIcon,
	sigmaIcon,
	tocIcon
} from '$lib/ui.js';
import { KeyBindingsController } from '$lib/plugins/bindings/mod.js';
import { NavigateHeadings } from './NavigateHeadings.js';
import { id } from '$lib/oneput/lib.js';

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
	back: {
		bindings: ['Meta+B'],
		action: (c) => {
			c.goBack();
		},
		description: 'Back'
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

/**
 * Standard input UI for use in most situations.
 */
const inputUI: (c: Controller) => OneputProps['input'] = (c) => {
	return {
		right: {
			id: 'root-input-right',
			type: 'hflex',
			children: [
				{
					id: id(),
					tag: 'button',
					attr: {
						type: 'button',
						title: 'Options',
						onclick: () => {
							if (c.menuOpen) {
								c.closeMenu();
							} else {
								c.openMenu();
							}
						}
					},
					classes: ['oneput__icon-button'],
					innerHTMLUnsafe: c.menuOpen ? chevronUp : chevronDown
				}
			]
		}
	};
};

const rootUI = (c: Controller) => {
	c.setBackBinding(() => {
		c.closeMenu();
	});
	c.update({
		onMenuOpenChange: () => {
			c.update({ input: inputUI(c) });
		}
	});
	c.update({
		input: inputUI(c),
		menu: {
			items: [
				menuItemWithIcon({
					id: 'settings',
					leftIcon: settingsIcon,
					text: 'Settings...',
					action: () => {
						settingsUI(c, () => {
							rootUI(c);
						});
					}
				}),
				menuItemWithIcon({
					id: 'navigate-outline',
					leftIcon: tocIcon,
					text: 'Navigate outline...',
					action: () => {
						NavigateHeadings.create(c, document, () => {
							rootUI(c);
						});
					}
				}),
				menuItemWithIcon({
					id: 'insert-katex',
					leftIcon: sigmaIcon,
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
};

const settingsUI = (c: Controller, back: () => void) => {
	c.setBackBinding(back);
	c.update({
		input: inputUI(c),
		menu: {
			items: [
				menuItemWithIcon({
					id: 'back',
					text: 'Back...',
					leftIcon: arrowLeftIcon,
					action: back
				}),
				menuItemWithIcon({
					id: 'global-keys',
					text: 'Set global key bindings...',
					action: () => {
						KeyBindingsController.create(c, globalKeys, false, () => {
							settingsUI(c, back);
						});
					}
				}),
				menuItemWithIcon({
					id: 'local-keys',
					text: 'Set local key bindings...',
					action: () => {
						KeyBindingsController.create(c, localKeys, true, () => {
							settingsUI(c, back);
						});
					}
				})
			]
		}
	});
};

// Our app starts in this callback.  We get the controller and we can set
// keys and configure oneput.
export const setController = (c: Controller) => {
	c.update({
		globalKeys: globalKeys,
		localKeys: localKeys
	});
	rootUI(c);
};
