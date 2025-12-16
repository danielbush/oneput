/**
 * These can be used as defaults.  You can set your own defaults instead if you prefer.
 */
import { KeyEventBindings, type KeyBindingMapSerializable } from '../../lib/bindings.js';
import type { Controller } from '../../controller.js';
import { GlobalFilter } from '../plugins/GlobalFilter.js';

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
		c.app.goBack();
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
		GlobalFilter.create(c).run();
	},
	fill: (c) => {
		c.menu.runFillHandler();
	},
	submit: (c) => {
		c.input.runSubmitHandler();
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
	submit: {
		bindings: ['$mod+Enter'],
		description: 'Submit input'
	},
	fill: {
		bindings: ['Tab'],
		description: 'Fill input using current menu item'
	},
	// NOTE: reserve 'Shift+Enter' for newlines in text area input.
	back: {
		bindings: ['Meta+B'],
		description: 'Back'
	},
	focusInput: {
		bindings: ['$mod+[', 'Control+['],
		description: 'Focus input'
	},
	closeMenu: {
		bindings: ['$mod+Shift+k', 'Escape'],
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

export const globalKeys = KeyEventBindings.fromSerializable(
	defaultGlobalBindings,
	defaultGlobalActions
).keyBindingMap;
export const localKeys = KeyEventBindings.fromSerializable(
	defaultLocalBindings,
	defaultLocalActions
).keyBindingMap;
