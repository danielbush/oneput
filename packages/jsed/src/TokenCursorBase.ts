import type { JsedDocument } from './types.js';
import { JSED_CURSOR_CLASS } from './lib/constants.js';
import { isLineSibling } from './lib/taxonomy.js';

export type TokenCursorError =
  | {
      /**
       * Cursor expected a TOKEN but got something else.
       */
      type: 'invalid-token';
    }
  | {
      /**
       * Cursor was passed an element that should not be a TOKEN.
       */
      type: 'expected-non-token';
    };

export type TokenCursorBaseParams = {
  document: JsedDocument;
  token: HTMLElement;
  onCursorChange: (token: HTMLElement) => void;
  onError: (err: TokenCursorError) => void;
};

/**
 * Base layer for the CURSOR. Holds the current TOKEN reference, manages
 * the JSED_CURSOR_CLASS, and provides protected focus-class management.
 */
export abstract class TokenCursorBase {
  #token: HTMLElement;
  #document: JsedDocument;
  #onCursorChange: (token: HTMLElement) => void;
  protected onError: (err: TokenCursorError) => void;

  constructor(params: TokenCursorBaseParams) {
    this.#token = params.token; // ts needs this before #setToken
    this.#document = params.document;
    this.#onCursorChange = params.onCursorChange;
    this.onError = params.onError;
    this.setToken(params.token);
  }

  /** Return the JsedDocument that owns this CURSOR session. */
  getDocument() {
    return this.#document;
  }

  // #region Token access

  /** Return the active TOKEN that the CURSOR is on. */
  getToken() {
    return this.#token;
  }

  /**
   * Set the active TOKEN for the CURSOR.
   *
   * The cursor change callback is fired after the DOM classes and scroll state
   * have been updated.
   */
  setToken(el: HTMLElement) {
    if (!isLineSibling(el)) {
      this.onError({ type: 'invalid-token' });
      throw new Error(`Not a LINE_SIBLING`);
    }
    this.removeAllFocusClasses();
    this.#token.classList.remove(JSED_CURSOR_CLASS);
    el.classList.add(JSED_CURSOR_CLASS);
    this.getDocument().viewportScroller.scrollIntoViewIfHidden(el, { vertical: 'nearest' });
    this.#token = el;
    this.#onCursorChange(el);
  }

  // #endregion

  // #region Focus classes

  #focusClasses: string[] = [];

  protected addFocusClasses(...classNames: string[]) {
    this.#token.classList.add(...classNames);
    this.#focusClasses.push(...classNames);
  }

  protected removeFocusClasses(...classNames: string[]) {
    this.#token.classList.remove(...classNames);
    this.#focusClasses = this.#focusClasses.filter((c) => !classNames.includes(c));
  }

  protected removeAllFocusClasses() {
    this.#token.classList.remove(...this.#focusClasses);
    this.#focusClasses = [];
  }

  // #endregion

  // #region Destroy

  /** Destroy the current edit session. The instance cannot be used after this. */
  destroy() {
    this.#token.classList.remove(JSED_CURSOR_CLASS);
    this.removeAllFocusClasses();
  }

  // #endregion
}
