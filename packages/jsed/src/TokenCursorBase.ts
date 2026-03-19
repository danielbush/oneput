import type { JsedDocument } from './types.js';
import { JSED_CURSOR_CLASS } from './lib/constants.js';
import * as token from './lib/token.js';
import type { TokenManager } from './TokenManager.js';

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
  tokenManager: TokenManager;
  token: HTMLElement;
  /** The LINE determined at entry time — used as the ceiling for CURSOR traversal. */
  line: HTMLElement;
  onTokenChange: (token: HTMLElement) => void;
  onError: (err: TokenCursorError) => void;
};

/**
 * Base layer for the CURSOR. Holds the current TOKEN reference, manages
 * the JSED_CURSOR_CLASS, and provides protected focus-class management.
 */
export abstract class TokenCursorBase {
  #token: HTMLElement;
  #line: HTMLElement;
  #document: JsedDocument;
  protected tokenManager: TokenManager;
  #onTokenChange: (token: HTMLElement) => void;
  protected onError: (err: TokenCursorError) => void;

  constructor(params: TokenCursorBaseParams) {
    this.#token = params.token; // ts needs this before #setToken
    this.#line = params.line;
    this.#document = params.document;
    this.tokenManager = params.tokenManager;
    this.#onTokenChange = params.onTokenChange;
    this.onError = params.onError;
    this.setTokenInternal(params.token);
  }

  getDocument() {
    return this.#document;
  }

  /** The LINE determined at entry time — ceiling for CURSOR traversal. */
  getLine() {
    return this.#line;
  }

  // #region Token access

  getToken() {
    return this.#token;
  }

  /**
   * Allows a consumer to set the token.
   *
   * The onTokenChange callback is not called. Instead, you should perform other
   * change before and after calling this.
   */
  setToken(el: HTMLElement) {
    if (!token.isLineSibling(el)) {
      this.onError({ type: 'invalid-token' });
      throw new Error(`Not a LINE_SIBLING`);
    }
    this.removeAllFocusClasses();
    this.#token.classList.remove(JSED_CURSOR_CLASS);
    el.classList.add(JSED_CURSOR_CLASS);
    this.#token = el;
  }

  /**
   * Called internally when an operation causes the token to change. We need to
   * notify the consumer, so we call the onTokenChange callback.
   */
  protected setTokenInternal(el: HTMLElement) {
    this.setToken(el);
    this.#onTokenChange(el);
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

  // #region Closing

  close() {
    this.#token.classList.remove(JSED_CURSOR_CLASS);
    this.removeAllFocusClasses();
  }

  // #endregion
}
