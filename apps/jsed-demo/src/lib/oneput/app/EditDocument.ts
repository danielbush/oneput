import type { AppObject, Controller } from '@oneput/oneput';
import * as jsed from '@oneput/jsed';

/**
 * Oneput AppObject that manages an edit session for a single document.
 */
export class EditDocument implements AppObject {
  static create(ctl: Controller, params: { document: jsed.JsedDocument }) {
    return new EditDocument(ctl, params.document);
  }

  constructor(
    private ctl: Controller,
    private document: jsed.JsedDocument
  ) {}

  public onStart = () => {
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
  };

  public onExit = () => {
    //
  };
}
