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
  constructor(params: { document: JsedDocument; token: HTMLElement }) {
    this.#document = params.document;
    this.#token = params.token; // ts
    this.setToken(params.token);
  }
  getToken() {
    return this.#token;
  }
  moveNext() {
    const nextToken = token.getNextLineSibling(this.#token);
    if (nextToken) {
      this.setToken(nextToken);
      this.#document.nav.FOCUS(nextToken);
    }
  }
  movePrevious() {
    const prevToken = token.getPreviousLineSibling(this.#token);
    if (prevToken) {
      this.setToken(prevToken);
      this.#document.nav.FOCUS(prevToken);
    }
  }
  replace(val: string) {
    // Because we re-use the existing token, we do NOT focus.
    this.#token = token.replaceText(this.#token, val);
  }
  delete() {
    const newToken = token.remove(this.#token);
    this.#token = newToken;
    this.#document.nav.FOCUS(newToken);
    return;
  }
  append(val: string): HTMLElement {
    const tok = token.createToken(val);
    token.insertAfter(tok, this.#token);
    return tok;
  }
  focus(el: HTMLElement): boolean {
    if (token.isToken(el)) {
      this.#document.nav.FOCUS(el);
      return true;
    }
    return false;
  }
  close() {
    this.#token.classList.remove(JSED_TOKEN_FOCUS_CLASS);
  }
}
