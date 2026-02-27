import type { AppObject, Controller } from '@oneput/oneput';
import * as jsed from '@oneput/jsed';
import { setDocument } from './_bindings.js';

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
    setDocument(this.document);
  };

  onExit = () => {
    //
  };

  actions = {
    EDIT_FIRST: () => {
      this.document
        .requestCursorUnderFocus({
          onTokenChange: () => {}
        })
        .mapErr((err) => {
          switch (err.type) {
            case 'no-token-under-focus':
              this.ctl.notify('No token under focus', { duration: 3000 });
              break;
            case 'no-focus':
              this.ctl.notify('No document focus found', { duration: 3000 });
              break;
          }
        });
    }
  };
}
