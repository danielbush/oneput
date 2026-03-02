import type { JsedDocument } from '@oneput/jsed';
import { bindings } from '@oneput/oneput';
import type { Controller, KeyBindingMapSerializable } from '@oneput/oneput';

const state: {
  currentDocument?: JsedDocument;
} = {};

export function setDocument(doc: JsedDocument) {
  state.currentDocument = doc;
}

export const defaultGlobalBindings: KeyBindingMapSerializable = {
  openMenu: {
    bindings: ['$mod+b'],
    description: 'Open Oneput menu...'
  },
  focusInput: {
    bindings: ['$mod+[', 'Control+['],
    description: 'Focus input'
  },
  hideOneput: {
    bindings: ['$mod+h'],
    description: 'Hide Oneput'
  },
  REC_NEXT: {
    bindings: ['$mod+Shift+j', 'Shift+ArrowDown'],
    description: 'Navigate to next element'
  },
  REC_PREV: {
    bindings: ['$mod+Shift+k', 'Shift+ArrowUp'],
    description: 'Navigate to previous element'
  },
  SIB_NEXT: { bindings: ['$mod+j', 'ArrowDown'], description: 'Navigate to next sibling' },
  SIB_PREV: { bindings: ['$mod+k', 'ArrowUp'], description: 'Navigate to previous sibling' },
  UP: { bindings: ['$mod+u', '$mod+ArrowUp'], description: 'Find next parent' },
  EDIT_FIRST: { bindings: ['enter'], description: 'Edit first editable token' },
  TOGGLE_SELECT: { bindings: ['$mod+e'], description: 'Toggle input element cursor state' }
};

export const defaultGlobalActions: Record<string, (c: Controller) => void> = {
  openMenu: (ctl) => {
    ctl.menu.openMenu();
  },
  focusInput: (ctl) => {
    ctl.input.focusInput();
  },
  hideOneput: (ctl) => {
    ctl.toggleHide();
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
  fill: (c) => {
    c.menu.runFillHandler();
  },
  submit: (c) => {
    c.input.runSubmitHandler();
  }
};

export const defaultLocalBindings: KeyBindingMapSerializable = {
  hideOneput: {
    bindings: [],
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
    bindings: ['$mod+b', 'Escape'],
    description: 'Close menu'
  },
  focusPreviousMenuItem: {
    bindings: ['$mod+k'],
    description: 'Focus previous menu item'
  },
  focusNextMenuItem: {
    bindings: ['$mod+j'],
    description: 'Focus next menu item'
  }
};

// Default local and global keybindings.

export const globalKeys = bindings.KeyEventBindings.fromSerializable(
  defaultGlobalBindings,
  defaultGlobalActions
).keyBindingMap;

export const localKeys = bindings.KeyEventBindings.fromSerializable(
  defaultLocalBindings,
  defaultLocalActions
).keyBindingMap;
