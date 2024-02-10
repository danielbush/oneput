import type { JsedDocument, IJsedCursor } from '../types';
import { JSED_TOKEN_FOCUS_CLASS } from './constants';
import * as token from './token';

export class JsedCursor implements IJsedCursor {
  #document: JsedDocument;
  /**
   * The token the cursor is currently on.
   */
  #token: HTMLElement;
  setToken(el: HTMLElement) {
    this.#token.classList.remove(JSED_TOKEN_FOCUS_CLASS);
    el.classList.add(JSED_TOKEN_FOCUS_CLASS);
    this.#token = el;
  }
  constructor(params: {
    document: JsedDocument;
    token: HTMLElement;
    ceiling: HTMLElement | null;
  }) {
    this.#document = params.document;
    this.#token = params.token; // ts
    this.setToken(params.token);
  }
  getToken() {
    return this.#token;
  }
  moveNext() {
    const nextToken = token.getNextSibling(this.#token);
    if (nextToken) {
      this.setToken(nextToken);
      this.#document.actions.FOCUS(nextToken);
      // this.#document.actions.FOCUS(nextToken, { keepTokenFocus: true });
    }
  }
  movePrevious() {
    const prevToken = token.getPreviousSibling(this.#token);
    if (prevToken) {
      this.setToken(prevToken);
      this.#document.actions.FOCUS(prevToken);
      // this.#document.actions.FOCUS(prevToken, { keepTokenFocus: true });
    }
  }
  replace(val: string) {
    token.replaceText(this.#token, val);
    // const maybeNewTok = token.replaceText(this.#token, val);
    // if (this.#token !== maybeNewTok) {
    //   // We don't want to cause a focus event unless the TOKEN has changed.  Set
    //   // the replaced flag to indicate to the consumer that the activeToken is
    //   // in fact replaced.
    //   this.#document.actions.FOCUS(maybeNewTok, { replaced: true });
    // }
  }
  delete() {
    const newToken = token.remove(this.#token);
    this.#token = newToken;
    this.#document.actions.FOCUS(newToken);
    return;
  }
  append(val: string): HTMLElement {
    const tok = token.createToken(val);
    token.insertAfter(tok, this.#token);
    return tok;
  }
  focus(el: HTMLElement): boolean {
    if (token.isToken(el)) {
      this.#document.actions.FOCUS(el);
      return true;
    }
    return false;
  }
  prepend() {}
  close() {
    this.#token.classList.remove(JSED_TOKEN_FOCUS_CLASS);
  }
}
