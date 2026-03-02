/**
 * These can be used as defaults.  You can set your own defaults instead if you prefer.
 */
import { KeyEventBindings, type KeyBindingMapSerializable } from '../../lib/bindings.js';
import type { Controller } from '../../controllers/controller.js';
import { GlobalFilter } from '../appObjects/GlobalFilter.js';

export const defaultActions: Record<string, (c: Controller) => void> = {
  openMenu: (c) => {
    c.menu.openMenu();
  },
  focusInput: (c) => {
    c.input.focusInput();
  },
  hideOneput: (c) => {
    c.toggleHide();
  },
  doAction: (c) => {
    c.menu.doMenuAction();
  },
  back: (c) => {
    c.app.goBack();
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
    // If you don't supply an icon mapping for GlobalFilterInputIcon you'll see
    // the "Missing Icon" icon.
    GlobalFilter.create(c, { icons: { InputIcon: 'GlobalFilterInputIcon' } }).onStart();
  },
  fill: (c) => {
    c.menu.runFillHandler();
  },
  submit: (c) => {
    c.input.runSubmitHandler();
  }
};

export const defaultBindingsSerializable: KeyBindingMapSerializable = {
  openMenu: {
    bindings: ['$mod+Shift+k'],
    description: 'Open Oneput menu...',
    when: { menuOpen: false }
  },
  focusInput: {
    bindings: ['$mod+[', 'Control+['],
    description: 'Focus input'
  },
  hideOneput: {
    bindings: ['$mod+h'],
    description: 'Hide Oneput'
  },
  doAction: {
    bindings: ['Enter'],
    description: 'Do action',
    when: { menuOpen: true }
  },
  submit: {
    bindings: ['$mod+Enter'],
    description: 'Submit input',
    when: { menuOpen: true }
  },
  fill: {
    bindings: ['Tab'],
    description: 'Fill input using current menu item',
    when: { menuOpen: true }
  },
  // NOTE: reserve 'Shift+Enter' for newlines in text area input.
  back: {
    bindings: ['Meta+B'],
    description: 'Back',
    when: { menuOpen: true }
  },
  closeMenu: {
    bindings: ['$mod+Shift+k', 'Escape'],
    description: 'Close menu',
    when: { menuOpen: true }
  },
  focusPreviousMenuItem: {
    bindings: ['$mod+k'],
    description: 'Focus previous menu item',
    when: { menuOpen: true }
  },
  focusNextMenuItem: {
    bindings: ['$mod+j'],
    description: 'Focus next menu item',
    when: { menuOpen: true }
  },
  globalFilter: {
    bindings: ['$mod+e'],
    description: 'Global filter',
    when: { menuOpen: true }
  }
};

export const defaultKeys = KeyEventBindings.fromSerializable(
  defaultBindingsSerializable,
  defaultActions
).keyBindingMap;
