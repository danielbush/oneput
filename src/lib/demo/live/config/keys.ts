import type { KeyBindingMap } from '$lib/oneput/KeysController.js';

export const globalKeys: KeyBindingMap = {
	openMenu: {
		bindings: ['$mod+Shift+k'],
		description: 'Open Oneput menu...',
		action: (c) => {
			c.menu.openMenu();
		}
	},
	focusInput: {
		bindings: ['$mod+[', 'Control+['],
		action: (c) => {
			c.input.focusInput();
		},
		description: 'Focus input'
	},
	hideOneput: {
		bindings: ['$mod+h'],
		description: 'Hide Oneput',
		action: (c) => {
			c.toggleHide();
		}
	}
};

export const localKeys: KeyBindingMap = {
	hideOneput: {
		bindings: ['$mod+h'],
		description: 'Hide Oneput',
		action: (c) => {
			c.toggleHide();
		}
	},
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
			c.input.focusInput();
		},
		description: 'Focus input'
	},
	closeMenu: {
		bindings: ['Escape', '$mod+Shift+k'],
		description: 'Close menu',
		action: (c) => {
			c.menu.closeMenu();
		}
	},
	focusPreviousMenuItem: {
		bindings: ['$mod+k'],
		description: 'Focus previous menu item',
		action: (c) => {
			c.menu.focusPreviousMenuItem();
		}
	},
	focusNextMenuItem: {
		bindings: ['$mod+j'],
		description: 'Focus next menu item',
		action: (c) => {
			c.menu.focusNextMenuItem();
		}
	}
};
