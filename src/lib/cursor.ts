import type { JsedDocument, IJsedCursor } from '../types';
import { JSED_TOKEN_FOCUS_CLASS } from './constants';
import * as token from './token';

export class JsedCursor implements IJsedCursor {
  /**
   * The token the cursor is currently on.
   */
  #token: HTMLElement;

  constructor(params: { document: JsedDocument; token: HTMLElement }) {
    this.#token = params.token; // ts
    this.setToken(params.token);
  }

  // #region Events

  #onSetToken?: (token: HTMLElement) => void;
  onSetToken(fn: (token: HTMLElement) => void) {
    this.#onSetToken = fn;
  }

  // #endregion

  // #region Setting

  getToken() {
    this.#failIfExhausted();
    return this.#token;
  }

  setToken(el: HTMLElement) {
    if (!token.isToken(el)) {
      throw new Error(`Not a token`);
    }
    this.#removeAllFocusClasses();
    this.#token.classList.remove(JSED_TOKEN_FOCUS_CLASS);
    el.classList.add(JSED_TOKEN_FOCUS_CLASS);
    this.#token = el;
    if (this.#onSetToken) {
      this.#onSetToken(el);
    }
  }

  // #endregion

  // #region Motion

  moveNext() {
    this.#failIfExhausted();
    const nextToken = token.getNextLineSibling(this.#token);
    if (nextToken) {
      this.setToken(nextToken);
    }
  }
  movePrevious() {
    this.#failIfExhausted();
    const prevToken = token.getPreviousLineSibling(this.#token);
    if (prevToken) {
      this.setToken(prevToken);
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
    this.setToken(newToken);
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
    this.#removeAllFocusClasses();
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

  // #region Other

  isSameLine(tok: HTMLElement) {
    return token.isSameLine(this.#token, tok);
  }

  // #endregion

  // #region Styling

  #focusClasses: string[] = [];
  addFocusClasses(...classNames: string[]) {
    this.#token.classList.add(...classNames);
    this.#focusClasses.push(...classNames);
  }
  removeFocusClasses(...classNames: string[]) {
    this.#token.classList.remove(...classNames);
    this.#focusClasses = this.#focusClasses.filter(
      (c) => !classNames.includes(c),
    );
  }
  #removeAllFocusClasses() {
    this.#token.classList.remove(...this.#focusClasses);
    this.#focusClasses = [];
  }

  // #endregion

  // #region Dom (non-token)

  /**
   * Focus on the new element anchor if there is one, else keep focused on
   * current token.
   */
  insertElementAfter(el: HTMLElement) {
    if (token.isToken(el)) {
      throw new Error(`Expected non-token element.`);
    }
    token.insertAfter(el, this.#token);

    // Focus on token in el?
    const first = token.getFirstToken(el);
    if (first) {
      this.setToken(first);
    }
  }

  /**
   * Focus on the new element anchor if there is one, else keep focused on
   * current token.
   */
  insertElementBefore(el: HTMLElement) {
    if (token.isToken(el)) {
      throw new Error(`Expected non-token element.`);
    }
    token.insertBefore(el, this.#token);

    // Focus on token in el?
    const first = token.getFirstToken(el);
    if (first) {
      this.setToken(first);
    }
  }

  // #endregion
}
