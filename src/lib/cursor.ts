import type { JsedDocument, IJsedCursor } from '../types';
import { JSED_TOKEN_FOCUS_CLASS } from './constants';
import * as token from './token';

export class JsedCursor implements IJsedCursor {
  #document: JsedDocument;
  /**
   * The token the cursor is currently on.
   */
  #token: HTMLElement;

  constructor(params: { document: JsedDocument; token: HTMLElement }) {
    this.#document = params.document;
    this.#token = params.token; // ts
    this.setToken(params.token);
  }

  // #region Setting

  getToken() {
    this.#failIfExhausted();
    return this.#token;
  }
  setToken(el: HTMLElement) {
    if (!token.isToken(el)) {
      throw new Error(`Not a token`);
    }
    this.#token.classList.remove(JSED_TOKEN_FOCUS_CLASS);
    el.classList.add(JSED_TOKEN_FOCUS_CLASS);
    this.#token = el;
  }

  // #endregion

  // #region Motion

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

  // #endregion

  // #region Editing tokens

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
      this.#setExhausted();
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

  // #endregion

  // #region Closing

  close() {
    this.#failIfExhausted();
    this.#token.classList.remove(JSED_TOKEN_FOCUS_CLASS);
  }
  #onClose?: () => void;
  onClose(fn: () => void) {
    this.#onClose = fn;
  }
  /**
   * In the situation where we delete all LINE siblings AND we don't keep an
   * ANCHOR, we will have no more tokens.  We will set this flag to true and
   * send a callback to the consumer of the cursor.
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

  // #endregion
}
