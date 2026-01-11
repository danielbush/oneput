import { start, type JsedDocument } from '../jsed/index.js';

class App {
  static create(doc: HTMLElement) {
    return new App(doc);
  }

  private doc: JsedDocument;

  constructor(private htmlDoc: HTMLElement) {
    this.doc = start(htmlDoc);
  }

  get document(): JsedDocument {
    return this.doc;
  }
}

export { App };
