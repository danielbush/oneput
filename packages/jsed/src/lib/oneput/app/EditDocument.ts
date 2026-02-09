import type { JsedCursor, JsedDocument } from '$lib/jsed/index.js';
import type { AppObject, Controller } from '$oneput';
import * as jsed from '$lib/jsed/index.js';

export class EditDocument implements AppObject {
  static create(ctl: Controller, params: { document: JsedDocument; token: HTMLElement }) {
    const createCursor = (instance: EditDocument) => {
      const cursor = params.document.requestCursor({
        token: params.token,
        onSetToken: instance.handleSetToken,
        onClose: instance.handleCursorClose
      });
      ctl.events.on('input-change', ({ value }) => {
        cursor.replace(value);
      });
      return cursor;
    };
    return new EditDocument(ctl, createCursor);
  }

  private cursor?: JsedCursor;

  constructor(
    private ctl: Controller,
    private createCursor: (instance: EditDocument) => JsedCursor
  ) {}

  handleCursorClose = () => {
    // clearInput();
    // blurInput();
    this.ctl.app.exit();
  };

  handleSetToken = async (token: HTMLElement) => {
    //// this.#cursorMarkers.clear();
    // this.#controller.onMobileKeyboardOpenOnce(() => {
    //   debug('correct mobile keyboard scroll');
    //   scrollIntoView(token);
    // });
    this.ctl.input.focusInput();
    await this.ctl.input.setInputValue(jsed.utils.token.getValue(token));
    this.ctl.input.selectAll();
    //// scrollIntoView(token);
    // this.#controller.setStatusElementFocus(token);
    this.cursor?.getDocument().nav.FOCUS(token);
  };

  onStart() {
    this.cursor = this.createCursor(this);
  }
}
