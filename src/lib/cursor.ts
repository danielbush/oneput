import type { JsedDocument, IJsedCursor } from '../types';
import { JSED_TOKEN_FOCUS_CLASS } from './constants';
import * as token from './token';

export class JsedCursor implements IJsedCursor {
  #document: JsedDocument;
  /**
   * The token the cursor is currently on.
   */
  #token: HTMLElement;
  /**
   * In the situation where we delete all LINE siblings AND we don't keep a
   * placeholder, we will have no more tokens.  We will set this flag to true
   * and send a callback to the consumer of the cursor.
   */
  #exhausted: boolean = false;
  #setExhausted() {
    this.close();
    this.#exhausted = true;
    if (this.#onClose) {
      this.#onClose();
    }
  }
  #failIfExhausted() {
    if (this.#exhausted) {
      throw new Error(
        `Cursor is exhausted.  No more tokens.  There is a callback that should have notified you of this.`,
      );
    }
  }
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
    this.#failIfExhausted();
    return this.#token;
  }
  moveNext() {
    this.#failIfExhausted();
    const nextToken = token.getNextLineSibling(this.#token);
    if (nextToken) {
      this.setToken(nextToken);
      this.#document.nav.FOCUS(nextToken);
    }
  }
  movePrevious() {
    this.#failIfExhausted();
    const prevToken = token.getPreviousLineSibling(this.#token);
    if (prevToken) {
      this.setToken(prevToken);
      this.#document.nav.FOCUS(prevToken);
    }
  }
  replace(val: string) {
    this.#failIfExhausted();
    // Because we re-use the existing token, we do NOT focus.
    this.#token = token.replaceText(this.#token, val);
  }
  delete(
    { keepAnchor }: { keepAnchor: boolean } = {
      keepAnchor: true,
    },
  ) {
    this.#failIfExhausted();
    const newToken = token.remove(this.#token, {
      keepAnchor,
    });
    if (!newToken) {
      console.log(`we're exhausted!`);
      this.#setExhausted();
      // TBC: we have to send an exit event to the owner of this cursor because
      // we've run out of tokens and we're not keeping a placeholder..
      return;
    }
    this.#token = newToken;
    this.#document.nav.FOCUS(newToken);
    return;
  }
  append(val: string): HTMLElement {
    this.#failIfExhausted();
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
    this.#failIfExhausted();
    this.#token.classList.remove(JSED_TOKEN_FOCUS_CLASS);
  }
  #onClose?: () => void;
  onClose(fn: () => void) {
    this.#onClose = fn;
  }
}
