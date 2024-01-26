import { JsedDocument, IJsedCursor } from './DocumentContext';
import * as token from '../lib/token';
import * as action from '../lib/action';

export class JsedCursor implements IJsedCursor {
  #document: JsedDocument;
  constructor(params: { document: JsedDocument }) {
    this.#document = params.document;
  }
  #getActiveTokenOrDie(): HTMLElement {
    if (this.#document.activeToken) {
      return this.#document.activeToken;
    }
    const err = new Error('JsedCursor: activeToken not set when it should be!');
    throw err;
  }
  getToken() {
    return this.#getActiveTokenOrDie();
  }
  moveNext() {
    if (!this.#document.activeToken) {
      return;
    }
    const prevToken = token.getNextSibling(this.#document.activeToken);
    if (prevToken) {
      action.FOCUS(this.#document, prevToken);
    }
  }
  movePrevious() {
    if (!this.#document.activeToken) {
      return;
    }
    const prevToken = token.getPreviousSibling(this.#document.activeToken);
    if (prevToken) {
      action.FOCUS(this.#document, prevToken);
    }
  }
  replace(val: string) {
    const tok = this.#getActiveTokenOrDie();
    const maybeNewTok = token.replaceText(tok, val);
    if (tok !== maybeNewTok) {
      // We don't want to cause a focus event unless the TOKEN has changed.  Set
      // the replaced flag to indicate to the consumer that the activeToken is
      // in fact replaced.
      action.FOCUS(this.#document, maybeNewTok, { replaced: true });
    }
  }
  delete() {
    const tok = this.#getActiveTokenOrDie();
    const newToken = token.remove(tok);
    action.FOCUS(this.#document, newToken);
    return;
  }
  append(val: string): HTMLElement {
    const tok = token.createToken(val);
    token.insertAfter(tok, this.#getActiveTokenOrDie());
    return tok;
  }
  focus(el: HTMLElement): boolean {
    if (token.isToken(el)) {
      action.FOCUS(this.#document, el);
      return true;
    }
    return false;
  }
  prepend() {}
  close() {}
}
