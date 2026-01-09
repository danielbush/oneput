import type { JsedDocument } from '$lib/jsed/types.js';

class App {
  static create() {
    return new App();
  }
  #document?: JsedDocument;
  setDocument(document: JsedDocument) {
    this.#document = document;
  }
  get document() {
    return this.#document;
  }
}

const app = App.create();
export { app };
