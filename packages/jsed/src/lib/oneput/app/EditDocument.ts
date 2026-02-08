import type { JsedCursor } from '$lib/jsed/index.js';
import type { AppObject, Controller } from '$oneput';

export class EditDocument implements AppObject {
  static create(ctl: Controller, params: { cursor: JsedCursor }) {
    return new EditDocument(ctl, params.cursor);
  }

  constructor(
    private ctl: Controller,
    private cursor: JsedCursor
  ) {}

  onStart() {
    console.log('cursor', this.cursor);
  }
}
