import { start, type JsedDocument, type JsedFocusEvent } from '../jsed/index.js';

class App {
  static create(doc: HTMLElement) {
    return new App(doc);
  }

  private doc: JsedDocument;

  constructor(htmlDoc: HTMLElement) {
    this.doc = start(htmlDoc);
    this.doc.listeners.FOCUS = this.handleElementFocus;
  }

  get document(): JsedDocument {
    return this.doc;
  }

  private handleElementFocus(evt: JsedFocusEvent) {
    console.log('handleElementFocus for', evt);
  }
}

export { App };
