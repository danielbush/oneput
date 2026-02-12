import type { Controller } from '$oneput';
import { state } from '../state.js';
import { Document } from '../Document.js';
import { EditDocument } from './EditDocument.js';
import * as jsed from '$lib/jsed/index.js';

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
  loadTestDoc: async (ctl) => {
    const docRoot = document.getElementById('load-doc');
    if (!docRoot) {
      ctl.notify('Could not load test doc!');
      return;
    }

    try {
      const response = await fetch('/api/docs/test_doc');
      if (!response.ok) {
        ctl.notify('Failed to load test doc!');
        return;
      }
      const html = await response.text();
      state.currentDocument = Document.createFromHTML(docRoot, html);
      ctl.menu.closeMenu();
    } catch (err) {
      ctl.notify('Error loading test doc!');
      console.error(err);
    }
  },
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
  EDIT_FIRST: (ctl) => {
    if (state?.currentDocument?.document) {
      const focus = state.currentDocument.document.nav.getFocus();
      if (focus) {
        const token = jsed.utils.token.getFirstToken(focus);
        if (token) {
          const session = EditDocument.create(ctl, {
            document: state.currentDocument.document,
            token
          });
          ctl.app.run(session);
        }
      }
    }
  },
  TOGGLE_SELECT: (ctl) => {
    ctl.input.toggleSelect();
  }
};
