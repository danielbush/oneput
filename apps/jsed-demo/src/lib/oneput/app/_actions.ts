import type { Controller } from '@oneput/oneput';
import { state } from '../state.js';

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
    state.currentDocument?.nav.REC_NEXT();
  },
  REC_PREV: () => {
    state.currentDocument?.nav.REC_PREV();
  },
  SIB_NEXT: () => {
    state.currentDocument?.nav.SIB_NEXT();
  },
  SIB_PREV: () => {
    state.currentDocument?.nav.SIB_PREV();
  },
  UP: () => {
    state.currentDocument?.nav.UP();
  },
  TOGGLE_SELECT: (ctl) => {
    ctl.input.toggleSelect();
  }
};
