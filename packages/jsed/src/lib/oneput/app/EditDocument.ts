import type { JsedDocument } from '$lib/jsed/types.js';
import type { AppObject, Controller } from '$oneput';

export class EditDocument implements AppObject {
  static create(ctl: Controller, doc: JsedDocument) {
    return new EditDocument(ctl, doc);
  }

  constructor(
    private ctl: Controller,
    private doc: JsedDocument
  ) {}

  onStart() {
    console.log('EditSession started');
  }
}
