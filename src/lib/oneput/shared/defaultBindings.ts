/**
 * These can be used as defaults.  You can set your own defaults instead if you prefer.
 */
import type { Controller } from '$lib/index.js';
import type { KeyBindingMapSerializable } from '$lib/oneput/KeyBinding.js';
import { GlobalFilter } from '$lib/oneput/plugins/GlobalFilter.js';
import { keyBindingMapFromSerializable } from '../bindings.js';

export const defaultGlobalActions: Record<string, (c: Controller) => void> = {
	openMenu: (c) => {
		c.menu.openMenu();
	},
	focusInput: (c) => {
		c.input.focusInput();
	},
	hideOneput: (c) => {
		c.toggleHide();
	}
};

export const defaultLocalActions: Record<string, (c: Controller) => void> = {
	hideOneput: (c) => {
		c.toggleHide();
	},
	doAction: (c) => {
		c.menu.doMenuAction();
	},
	back: (c) => {
		c.goBack();
	},
	focusInput: (c) => {
		c.input.focusInput();
	},
	closeMenu: (c) => {
		c.menu.closeMenu();
	},
	focusPreviousMenuItem: (c) => {
		c.menu.focusPreviousMenuItem();
	},
	focusNextMenuItem: (c) => {
		c.menu.focusNextMenuItem();
	},
	globalFilter: (c) => {
		GlobalFilter.create(c).runUI();
	}
};

export const defaultGlobalBindings: KeyBindingMapSerializable = {
	openMenu: {
		bindings: ['$mod+Shift+k'],
		description: 'Open Oneput menu...'
	},
	focusInput: {
		bindings: ['$mod+[', 'Control+['],
		description: 'Focus input'
	},
	hideOneput: {
		bindings: ['$mod+h'],
		description: 'Hide Oneput'
	}
};

export const defaultLocalBindings: KeyBindingMapSerializable = {
	hideOneput: {
		bindings: ['$mod+h'],
		description: 'Hide Oneput'
	},
	doAction: {
		bindings: ['Enter'],
		description: 'Do action'
	},
	back: {
		bindings: ['Meta+B'],
		description: 'Back'
	},
	focusInput: {
		bindings: ['$mod+[', 'Control+['],
		description: 'Focus input'
	},
	closeMenu: {
		bindings: ['Escape', '$mod+Shift+k'],
		description: 'Close menu'
	},
	focusPreviousMenuItem: {
		bindings: ['$mod+k'],
		description: 'Focus previous menu item'
	},
	focusNextMenuItem: {
		bindings: ['$mod+j'],
		description: 'Focus next menu item'
	},
	globalFilter: {
		bindings: ['$mod+e'],
		description: 'Global filter'
	}
};

export const globalKeys = keyBindingMapFromSerializable(
	defaultGlobalBindings,
	defaultGlobalActions
);
export const localKeys = keyBindingMapFromSerializable(defaultLocalBindings, defaultLocalActions);
