import type { Controller } from '@oneput/oneput';
import { state } from '../state.js';
import * as jsed from '@oneput/jsed';
import { Document } from './Document.js';
import { errAsync, ResultAsync, err, ok } from 'neverthrow';

export type ActionError =
  | { type: 'network'; cause: Error }
  | { type: 'http'; status: number; statusText: string }
  | { type: 'missing-element'; id: string };

/**
 * Use neverthrow.  Returns an Err if the fetch fails or status is not OK.
 */
function safeFetch(input: RequestInfo | URL, init?: RequestInit) {
  return ResultAsync.fromPromise(
    fetch(input, init),
    (e): ActionError => ({ type: 'network', cause: e as Error })
  ).andThen((response) =>
    response.ok
      ? ok(response)
      : err<Response, ActionError>({
          type: 'http',
          status: response.status,
          statusText: response.statusText
        })
  );
}

/**
 * Standalone actions we can import and use in menus, buttons etc.
 */
export class Actions {
  static create(ctl: Controller) {
    return new Actions(ctl, { fetch: safeFetch });
  }
  constructor(
    private ctl: Controller,
    private params: { fetch: typeof safeFetch }
  ) {}

  loadTestDoc() {
    const docRoot = document.getElementById('load-doc');
    if (!docRoot) {
      return errAsync<void, ActionError>({ type: 'missing-element', id: 'load-doc' });
    }
    return this.params
      .fetch('/api/docs/test_doc')
      .andThen((response) =>
        ResultAsync.fromPromise(
          response.text(),
          (e): ActionError => ({ type: 'network', cause: e as Error })
        )
      )
      .map((html) => {
        this.ctl.app.run(
          Document.create(this.ctl, {
            document: jsed.Document.createFromHTML(this.ctl, docRoot, html)
          })
        );
        this.ctl.menu.closeMenu();
      });
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
