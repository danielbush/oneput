import type { JsedDocument, ITokenCursor } from './types.js';
import { CursorMarkers } from './CursorMarkers.js';
import { JSED_TOKEN_FOCUS_CLASS } from './lib/constants.js';
import * as token from './lib/token.js';
import type { UserInputSelectionState } from './UserInput.js';
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

export class TokenCursor implements ITokenCursor {
  static create(params: {
    document: JsedDocument;
    tokenManager: TokenManager;
    token: HTMLElement;
    onTokenChange: (token: HTMLElement) => void;
    onError: (err: TokenCursorError) => void;
  }) {
    return new TokenCursor({
      document: params.document,
      tokenManager: params.tokenManager,
      token: params.token,
      onTokenChange: params.onTokenChange,
      onError: params.onError
    });
  }

  /**
   * The token the cursor is currently on.
   */
  #token: HTMLElement;
  #document: JsedDocument;
  #tokenManager: TokenManager;
  #onTokenChange: (token: HTMLElement) => void;
  #cursorMarkers: CursorMarkers;
  #onError: (err: TokenCursorError) => void;

  constructor(params: {
    document: JsedDocument;
    tokenManager: TokenManager;
    token: HTMLElement;
    onTokenChange: (token: HTMLElement) => void;
    onError: (err: TokenCursorError) => void;
  }) {
    this.#token = params.token; // ts
    this.#document = params.document;
    this.#tokenManager = params.tokenManager;
    this.#onTokenChange = params.onTokenChange;
    this.#onError = params.onError;
    this.#setToken(params.token);
    this.#cursorMarkers = CursorMarkers.create(this);
  }

  public handleInputChange = (input: string): void => {
    this.#cursorMarkers.handleInputChange(input);
  };

  public handleSelectionChange = (selection: UserInputSelectionState): void => {
    this.#cursorMarkers.handleSelectionChange(selection);
  };

  getDocument() {
    return this.#document;
  }

  // #region Setting

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
    if (!token.isToken(el)) {
      this.#onError({ type: 'invalid-token' });
      throw new Error(`Not a token`);
    }
    this.#removeAllFocusClasses();
    this.#token.classList.remove(JSED_TOKEN_FOCUS_CLASS);
    el.classList.add(JSED_TOKEN_FOCUS_CLASS);
    this.#token = el;
  }

  /**
   * Called internally when an operation causes the token to change. We need to
   * notify the consumer, so we call the onTokenChange callback.
   */
  #setToken(el: HTMLElement) {
    this.setToken(el);
    this.#onTokenChange(el);
  }

  // #endregion

  // #region Motion

  moveNext() {
    if (this.#cursorMarkers.isInsertingBefore()) {
      this.#cursorMarkers.clear();
      return;
    }

    const nextToken = token.getNextLineSibling(this.#token);
    if (nextToken) {
      this.#setToken(nextToken);
    }
  }
  movePrevious() {
    if (this.#cursorMarkers.isInsertingAfter()) {
      this.#cursorMarkers.clear();
      return;
    }

    const prevToken = token.getPreviousLineSibling(this.#token);
    if (prevToken) {
      this.#setToken(prevToken);
    }
  }

  // #endregion

  // #region Editing tokens

  replace(val: string) {
    // Because we re-use the existing token, we do NOT focus.
    this.#token = token.replaceText(this.#token, val);
  }
  delete() {
    const { next: nextTok } = token.remove(this.#token);
    this.#setToken(nextTok);
    return;
  }
  append(val: string): HTMLElement {
    const tok = token.createToken(val);
    token.insertAfter(tok, this.#token);
    return tok;
  }

  /**
   * COLLAPSE the current token.
   */
  toggleCollapseNext() {
    if (token.isCollapsed(this.#token)) {
      token.uncollapse(this.#token);
      return false;
    } else {
      token.collapse(this.#token);
      return true;
    }
  }

  /**
   * COLLAPSE the token previous to the current token.
   */
  toggleCollapsePrevious() {
    const prev = token.getPreviousLineSibling(this.#token);
    if (!prev) {
      return false;
    }
    if (token.isCollapsed(prev)) {
      token.uncollapse(prev);
      return false;
    } else {
      token.collapse(prev);
      return true;
    }
  }

  joinNext() {
    token.joinNext(this.#token);
  }

  joinPrevious() {
    token.joinPrevious(this.#token);
  }

  splitBefore() {
    token.splitBefore(this.#token);
    // We may end up in a new token, so we need to update the focus.
    this.#setToken(this.#token);
  }

  splitAfter() {
    const [, after] = token.splitAfter(this.#token);
    const firstTok = this.#tokenManager.tokenizeFirst(after);
    if (firstTok) {
      this.#setToken(firstTok);
    }
  }

  // #endregion

  // #region Closing

  close() {
    this.#token.classList.remove(JSED_TOKEN_FOCUS_CLASS);
    this.#removeAllFocusClasses();
    this.#cursorMarkers.close();
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
    this.#focusClasses = this.#focusClasses.filter((c) => !classNames.includes(c));
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
      this.#onError({ type: 'expected-non-token' });
      throw new Error(`Expected non-token element.`);
    }
    token.insertAfter(el, this.#token);

    // Focus on token in el?
    const first = this.#tokenManager.tokenizeFirst(el);
    if (first) {
      this.#setToken(first);
    }
  }

  /**
   * Focus on the new element anchor if there is one, else keep focused on
   * current token.
   */
  insertElementBefore(el: HTMLElement) {
    if (token.isToken(el)) {
      this.#onError({ type: 'expected-non-token' });
      throw new Error(`Expected non-token element.`);
    }
    token.insertBefore(el, this.#token);

    // Focus on token in el?
    const first = this.#tokenManager.tokenizeFirst(el);
    if (first) {
      this.#setToken(first);
    }
  }

  // #endregion
}
