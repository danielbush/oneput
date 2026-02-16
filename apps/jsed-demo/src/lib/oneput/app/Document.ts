import type { AppObject, Controller } from 'oneput';
import * as jsed from 'jsed';

/**
 * Oneput AppObject that manages a single JsedDocument.
 */
export class Document implements AppObject {
  static create(ctl: Controller, params: { document: jsed.Document }) {
    return new Document(ctl, params.document);
  }

  constructor(
    private ctl: Controller,
    private document: jsed.Document
  ) {}

  onStart = () => {
    //
  };

  onExit = () => {
    //
  };

  actions = {
    EDIT_FIRST: () => {
      const focus = this.document.document.nav.getFocus();
      if (focus) {
        const token = jsed.utils.token.getFirstToken(focus);
        if (token) {
          console.warn('TODO: implement EDIT_FIRST');
        }
      }
    }
  };
}
