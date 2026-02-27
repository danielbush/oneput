import type { AppObject, Controller } from '@oneput/oneput';
import * as jsed from '@oneput/jsed';

/**
 * Oneput AppObject that manages a single JsedDocument.
 */
export class ViewDocument implements AppObject {
  static create(ctl: Controller, params: { document: jsed.JsedDocument }) {
    return new ViewDocument(ctl, params.document);
  }

  constructor(
    private ctl: Controller,
    private document: jsed.JsedDocument
  ) {}

  onStart = () => {
    //
  };

  onExit = () => {
    //
  };

  actions = {
    EDIT_FIRST: () => {
      const focus = this.document.nav.getFocus();
      if (focus) {
        const token = jsed.utils.token.getFirstToken(focus);
        if (token) {
          console.warn('TODO: implement EDIT_FIRST');
        }
      }
    }
  };
}
