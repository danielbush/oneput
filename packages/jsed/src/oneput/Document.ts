import type { Controller } from "$oneput";
import { start, type JsedDocument, type JsedFocusEvent } from "../index.js";
import { ElementIndicator } from "./ElementIndicator.js";

/**
 * Represents an editable html ("document") and interfaces with Oneput and jsed.
 *
 * When created we can navigate the document and launch Editor to edit it.
 */
export class Document {
  static createFromHTML(
    ctl: Controller,
    docRoot: HTMLElement,
    htmlContent: string,
  ) {
    docRoot.innerHTML = htmlContent;
    return Document.create(ctl, docRoot);
  }

  static create(ctl: Controller, el: HTMLElement) {
    const elementIndicator = ElementIndicator.create();
    const jsedDocument = start(el);
    return new Document(ctl, jsedDocument, elementIndicator);
  }

  constructor(
    private ctl: Controller,
    public document: JsedDocument,
    private elementIndicator: ElementIndicator,
  ) {
    this.document.listeners.FOCUS = this.handleElementFocus;
    this.document.nav.FOCUS(this.document.root);

    // Configure indicator:
    const focus = this.document.nav.getFocus();
    this.elementIndicator.updateFocus(focus);
    this.elementIndicator.showIndicator(true);
  }

  private handleElementFocus = (evt: JsedFocusEvent) => {
    const el = evt.targetType === "F_ELEM" ? evt.element : evt.token;
    this.elementIndicator.updateFocus(el);
  };
}
