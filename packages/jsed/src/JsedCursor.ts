import type { JsedDocument, IJsedCursor } from './types.js';
import type { CursorMarkers } from './CursorMarkers.js';
import { JSED_TOKEN_FOCUS_CLASS } from './lib/constants.js';
import * as token from './lib/token.js';

export class JsedCursor implements IJsedCursor {
  static create(params: {
    document: JsedDocument;
    token: HTMLElement;
    onTokenChange: (token: HTMLElement) => void;
    create: {
      CursorMarkers: (cursor: IJsedCursor) => CursorMarkers;
    };
  }) {
    return new JsedCursor({
      document: params.document,
      token: params.token,
      onTokenChange: params.onTokenChange,
      create: params.create
    });
  }

  /**
   * The token the cursor is currently on.
   */
  #token: HTMLElement;
  #document: JsedDocument;
  #onTokenChange: (token: HTMLElement) => void;
  #cursorMarkers: CursorMarkers;

  constructor(params: {
    document: JsedDocument;
    token: HTMLElement;
    onTokenChange: (token: HTMLElement) => void;
    create: {
      CursorMarkers: (cursor: IJsedCursor) => CursorMarkers;
    };
  }) {
    this.#token = params.token; // ts
    this.#document = params.document;
    this.#onTokenChange = params.onTokenChange;
    this.#setToken(params.token);
    this.#cursorMarkers = params.create.CursorMarkers(this);
  }

  getDocument() {
    return this.#document;
  }

  // #region Setting

  getToken() {
    this.#failIfExhausted();
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
    this.#failIfExhausted();
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
    this.#failIfExhausted();
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
    this.#failIfExhausted();
    // Because we re-use the existing token, we do NOT focus.
    this.#token = token.replaceText(this.#token, val);
  }
  delete(
    { keepAnchor }: { keepAnchor: boolean } = {
      keepAnchor: true
    }
  ) {
    this.#failIfExhausted();
    const landOnTok =
      token.getPreviousLineSibling(this.#token) || token.getNextLineSibling(this.#token);
    token.remove(this.#token, {
      keepAnchor
    });
    if (!landOnTok) {
      this.#setExhausted();
      return;
    }
    this.#setToken(landOnTok);
    return;
  }
  append(val: string): HTMLElement {
    this.#failIfExhausted();
    const tok = token.createToken(val);
    token.insertAfter(tok, this.#token);
    return tok;
  }

  /**
   * COLLAPSE the current token.
   */
  toggleCollapseNext() {
    this.#failIfExhausted();
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
    this.#failIfExhausted();
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
    this.#failIfExhausted();
    token.joinNext(this.#token);
  }

  joinPrevious() {
    this.#failIfExhausted();
    token.joinPrevious(this.#token);
  }

  splitBefore() {
    this.#failIfExhausted();
    token.splitBefore(this.#token);
    // We may end up in a new token, so we need to update the focus.
    this.#setToken(this.#token);
  }

  splitAfter() {
    this.#failIfExhausted();
    const [, after] = token.splitAfter(this.#token);
    const firstTok = token.getFirstToken(after);
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
    this.#failIfExhausted();
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
  }
  #failIfExhausted() {
    if (this.#exhausted) {
      throw new Error(
        `Cursor is exhausted.  No more tokens.  There is a callback that should have notified you of this.`
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
      throw new Error(`Expected non-token element.`);
    }
    token.insertAfter(el, this.#token);

    // Focus on token in el?
    const first = token.getFirstToken(el);
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
      throw new Error(`Expected non-token element.`);
    }
    token.insertBefore(el, this.#token);

    // Focus on token in el?
    const first = token.getFirstToken(el);
    if (first) {
      this.#setToken(first);
    }
  }

  // #endregion
}
