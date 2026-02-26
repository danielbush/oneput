import type { AppObject, Controller } from '@oneput/oneput';
import * as jsed from '@oneput/jsed';

/**
 * Oneput AppObject that manages an edit session for a single document.
 */
export class EditDocument implements AppObject {
  static create(
    ctl: Controller,
    params: { document: jsed.JsedDocument; onStart: () => void; onExit: () => void }
  ) {
    return new EditDocument(ctl, params.document, params.onStart, params.onExit);
  }

  constructor(
    private ctl: Controller,
    private document: jsed.JsedDocument,
    public onStart: () => void,
    public onExit: () => void
  ) {}
}
