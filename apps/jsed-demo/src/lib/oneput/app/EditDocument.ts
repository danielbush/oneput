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
    //
  };

  public onExit = () => {
    //
  };
}
