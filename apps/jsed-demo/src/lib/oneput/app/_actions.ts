import type { Controller } from '@oneput/oneput';
import { state } from '../state.js';
import * as jsed from '@oneput/jsed';
import { Document } from './Document.js';

/**
 * Standalone actions we can import and use in menus, buttons etc.
 */
export class Actions {
  static create(ctl: Controller) {
    return new Actions(ctl);
  }
  constructor(private ctl: Controller) {}

  async loadTestDoc() {
    const docRoot = document.getElementById('load-doc');
    if (!docRoot) {
      this.ctl.notify('Could not load test doc!');
      return;
    }
    try {
      const response = await fetch('/api/docs/test_doc');
      if (!response.ok) {
        this.ctl.notify('Failed to load test doc!');
        return;
      }
      const html = await response.text();
      this.ctl.app.run(
        Document.create(this.ctl, {
          document: jsed.Document.createFromHTML(this.ctl, docRoot, html)
        })
      );
      this.ctl.menu.closeMenu();
    } catch (err) {
      this.ctl.notify('Error loading test doc!');
      console.error(err);
    }
  }
}

export const actions: Record<string, (ctl: Controller) => void> = {
  openMenu: (ctl) => {
    ctl.menu.openMenu();
  },
  focusInput: (ctl) => {
    ctl.input.focusInput();
  },
  hideOneput: (ctl) => {
    ctl.toggleHide();
  },

  // Editor actions

  REC_NEXT: () => {
    state.currentDocument?.document.nav.REC_NEXT();
  },
  REC_PREV: () => {
    state.currentDocument?.document.nav.REC_PREV();
  },
  SIB_NEXT: () => {
    state.currentDocument?.document.nav.SIB_NEXT();
  },
  SIB_PREV: () => {
    state.currentDocument?.document.nav.SIB_PREV();
  },
  UP: () => {
    state.currentDocument?.document.nav.UP();
  },
  TOGGLE_SELECT: (ctl) => {
    ctl.input.toggleSelect();
  }
};
