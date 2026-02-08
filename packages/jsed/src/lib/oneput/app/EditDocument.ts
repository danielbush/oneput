import type { JsedDocument } from '$lib/jsed/types.js';
import type { AppObject, Controller } from '$oneput';

export class EditDocument implements AppObject {
  static create(ctl: Controller, params: { document: JsedDocument; token: HTMLElement }) {
    return new EditDocument(ctl, params.document, params.token);
  }

  constructor(
    private ctl: Controller,
    private doc: JsedDocument,
    private token: HTMLElement
  ) {}

  onStart() {
    console.log('EditSession started', this.doc, this.token);
  }
}
