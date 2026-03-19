import type { JsedDocument } from '@oneput/jsed';
import { bindings } from '@oneput/oneput';
import type { Controller, KeyBindingMapSerializable } from '@oneput/oneput';

const state: {
  currentDocument?: JsedDocument;
} = {};

export function setDocument(doc: JsedDocument) {
  state.currentDocument = doc;
}

export const defaultBindingsSerializable: KeyBindingMapSerializable = {
  openMenu: {
    bindings: ['$mod+b'],
    description: 'Open Oneput menu...',
    when: { menuOpen: false }
  },
  closeMenu: {
    bindings: ['$mod+b', 'Escape'],
    description: 'Close menu',
    when: { menuOpen: true }
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
  // NOTE: reserve 'Shift+Enter' for newlines in text area input.
  back: {
    bindings: ['Shift+Meta+B'],
    description: 'Back',
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
  }
};

export const defaultActions: Record<string, (c: Controller) => void> = {
  openMenu: (ctl) => {
    ctl.menu.openMenu();
  },
  focusInput: (ctl) => {
    ctl.input.focusInput();
  },
  hideOneput: (ctl) => {
    ctl.toggleHide();
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
  fill: (c) => {
    c.menu.runFillHandler();
  },
  submit: (c) => {
    c.input.runSubmitHandler();
  }
};

export const defaultKeys = bindings.KeyEventBindings.fromSerializable(
  defaultBindingsSerializable,
  defaultActions
).keyBindingMap;
