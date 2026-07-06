/**
 * These can be used as defaults.  You can set your own defaults instead if you prefer.
 */
import { KeyEventBindings, type KeyBindingMapSerializable } from '../../lib/bindings.js';
import type { Controller } from '../../controllers/controller.js';
import { GlobalFilter } from '../appObjects/GlobalFilter.js';
import { OneputAction } from './OneputAction.js';

export const defaultActions: Record<string, (c: Controller) => void> = {
  [OneputAction.EXIT]: (c) => {
    c.app.exit();
  },
  [OneputAction.FOCUS_INPUT]: (c) => {
    c.input.focusInput();
  },
  [OneputAction.OPEN_MENU]: (c) => {
    c.menu.openMenu();
  },
  [OneputAction.HIDE_ONEPUT]: (c) => {
    c.toggleHide();
  },
  [OneputAction.DO_ACTION]: (c) => {
    c.menu.doMenuAction();
  },
  [OneputAction.BACK]: (c) => {
    c.app.goBack();
  },
  [OneputAction.CLOSE_MENU]: (c) => {
    c.menu.closeMenu();
  },
  [OneputAction.FOCUS_PREVIOUS_MENU_ITEM]: (c) => {
    c.menu.focusPreviousMenuItem();
  },
  [OneputAction.FOCUS_NEXT_MENU_ITEM]: (c) => {
    c.menu.focusNextMenuItem();
  },
  [OneputAction.GLOBAL_FILTER]: (c) => {
    // If you don't supply an icon mapping for GlobalFilterInputIcon you'll see
    // the "Missing Icon" icon.
    GlobalFilter.create(c, { icons: { InputIcon: 'GlobalFilterInputIcon' } }).onStart();
  },
  [OneputAction.FILL]: (c) => {
    c.menu.runFillHandler();
  },
  [OneputAction.SUBMIT]: (c) => {
    c.input.runSubmitHandler();
  }
};

export const defaultBindingsSerializable: KeyBindingMapSerializable = {
  [OneputAction.EXIT]: {
    bindings: ['Control+[', '$mod+[', 'Escape'],
    description: 'Exit',
    when: { menuOpen: false }
  },
  [OneputAction.FOCUS_INPUT]: {
    bindings: [`$mod+'`, `Control+'`],
    description: 'Focus input'
  },
  [OneputAction.OPEN_MENU]: {
    bindings: ['$mod+Shift+b'],
    description: 'Open Oneput menu...',
    when: { menuOpen: false }
  },
  [OneputAction.HIDE_ONEPUT]: {
    bindings: ['$mod+h'],
    description: 'Hide Oneput'
  },
  [OneputAction.DO_ACTION]: {
    bindings: ['Enter'],
    description: 'Do action',
    when: { menuOpen: true }
  },
  [OneputAction.SUBMIT]: {
    bindings: ['$mod+Enter'],
    description: 'Submit input',
    when: { menuOpen: true }
  },
  [OneputAction.FILL]: {
    bindings: ['Tab'],
    description: 'Fill input using current menu item',
    when: { menuOpen: true }
  },
  // NOTE: reserve 'Shift+Enter' for newlines in text area input.
  [OneputAction.BACK]: {
    bindings: ['$mod+b'],
    description: 'Back',
    when: { menuOpen: true }
  },
  [OneputAction.CLOSE_MENU]: {
    bindings: ['$mod+Shift+b', 'Escape'],
    description: 'Close menu',
    when: { menuOpen: true }
  },
  [OneputAction.FOCUS_PREVIOUS_MENU_ITEM]: {
    bindings: ['$mod+k'],
    description: 'Focus previous menu item',
    when: { menuOpen: true }
  },
  [OneputAction.FOCUS_NEXT_MENU_ITEM]: {
    bindings: ['$mod+j'],
    description: 'Focus next menu item',
    when: { menuOpen: true }
  },
  [OneputAction.GLOBAL_FILTER]: {
    bindings: ['$mod+e'],
    description: 'Global filter',
    when: { menuOpen: true }
  }
};

export const defaultKeys = KeyEventBindings.fromSerializable(
  defaultBindingsSerializable,
  defaultActions
).keyBindingMap;
