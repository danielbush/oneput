import { start, type JsedDocument, type JsedFocusEvent } from '../jsed/index.js';
import { ElementIndicator } from './ElementIndicator.js';

/**
 * Represents an editable html ("document").
 *
 * When created we can navigate the document and launch Editor to edit it.
 */
export class Document {
  static createFromHTML(docRoot: HTMLElement, htmlContent: string) {
    docRoot.innerHTML = htmlContent;
    return Document.create(docRoot);
  }

  static create(doc: HTMLElement) {
    const elementIndicator = ElementIndicator.create();
    return new Document(doc, elementIndicator);
  }

  private doc: JsedDocument;

  constructor(
    htmlDoc: HTMLElement,
    private elementIndicator: ElementIndicator
  ) {
    this.doc = start(htmlDoc);
    this.doc.listeners.FOCUS = this.handleElementFocus;
    this.doc.nav.FOCUS(this.doc.root);

    // Configure indicator:
    const focus = this.doc.nav.getFocus();
    this.elementIndicator.updateFocus(focus);
    this.elementIndicator.showIndicator(true);
  }

  get document(): JsedDocument {
    return this.doc;
  }

  private handleElementFocus = (evt: JsedFocusEvent) => {
    const el = evt.targetType === 'F_ELEM' ? evt.element : evt.token;
    this.elementIndicator.updateFocus(el);
  };
}
