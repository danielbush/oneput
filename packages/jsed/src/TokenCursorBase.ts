import type { JsedDocument } from './types.js';
import type { Tokenizer } from './Tokenizer.js';
import {
  CURSOR_APPEND_CLASS,
  CURSOR_INSERT_AFTER_CLASS,
  CURSOR_INSERT_BEFORE_CLASS,
  CURSOR_PREPEND_CLASS,
  JSED_CURSOR_CLASS
} from './lib/constants.js';
import { isLineSibling } from './lib/taxonomy.js';
import type { UserInputSelectionState } from './UserInput.js';

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
  tokenizer: Tokenizer;
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
  #tokenizer: Tokenizer;
  #onCursorChange: (token: HTMLElement) => void;
  protected onError: (err: TokenCursorError) => void;

  constructor(params: TokenCursorBaseParams) {
    this.#token = params.token; // ts needs this before #setToken
    this.#document = params.document;
    this.#tokenizer = params.tokenizer;
    this.#onCursorChange = params.onCursorChange;
    this.onError = params.onError;
    this.setToken(params.token);
  }

  /** Return the JsedDocument that owns this CURSOR session. */
  getDocument() {
    return this.#document;
  }

  /** Return the Tokenizer that owns tokenization/detokenization lifecycle. */
  getTokenizer() {
    return this.#tokenizer;
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

  // #region CURSOR_STATE

  /** Update CURSOR_STATE markers from the current input value. */
  public handleInputChange = (input: string): void => {
    if (input.endsWith(' ')) {
      this.setMarker(CURSOR_INSERT_AFTER_CLASS);
    } else if (input.startsWith(' ')) {
      this.setMarker(CURSOR_INSERT_BEFORE_CLASS);
    } else {
      this.clearMarkers();
    }
  };

  /** Update CURSOR_STATE markers from the current input selection. */
  public handleSelectionChange = (selection: UserInputSelectionState): void => {
    switch (selection) {
      case 'CURSOR_AT_BEGINNING':
        this.setMarker(CURSOR_PREPEND_CLASS);
        return;
      case 'CURSOR_AT_END':
        this.setMarker(CURSOR_APPEND_CLASS);
        return;
      default:
        this.clearMarkers();
    }
  };

  private setMarker(className?: string): void {
    this.clearMarkers();
    if (className) {
      this.addFocusClasses(className);
    }
  }

  protected clearMarkers(): void {
    this.removeFocusClasses(
      CURSOR_INSERT_AFTER_CLASS,
      CURSOR_INSERT_BEFORE_CLASS,
      CURSOR_PREPEND_CLASS,
      CURSOR_APPEND_CLASS
    );
  }

  /** Whether the CURSOR_STATE is CURSOR_APPEND on the current TOKEN. */
  isAppend(): boolean {
    return this.getToken().classList.contains(CURSOR_APPEND_CLASS);
  }

  /** Whether the CURSOR_STATE is CURSOR_PREPEND on the current TOKEN. */
  isPrepend(): boolean {
    return this.getToken().classList.contains(CURSOR_PREPEND_CLASS);
  }

  /** Whether the CURSOR_STATE is CURSOR_INSERT_AFTER on the current TOKEN. */
  isInsertingAfter(): boolean {
    return this.getToken().classList.contains(CURSOR_INSERT_AFTER_CLASS);
  }

  /** Whether the CURSOR_STATE is CURSOR_INSERT_BEFORE on the current TOKEN. */
  isInsertingBefore(): boolean {
    return this.getToken().classList.contains(CURSOR_INSERT_BEFORE_CLASS);
  }

  // #endregion

  // #region Destroy

  /** Destroy the current edit session. The instance cannot be used after this. */
  destroy() {
    this.clearMarkers();
    this.#token.classList.remove(JSED_CURSOR_CLASS);
    this.removeAllFocusClasses();
  }

  // #endregion
}
