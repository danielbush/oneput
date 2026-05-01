import {
  CURSOR_APPEND_CLASS,
  CURSOR_INSERT_AFTER_CLASS,
  CURSOR_INSERT_BEFORE_CLASS,
  CURSOR_PREPEND_CLASS,
  JSED_CURSOR_CLASS
} from './lib/constants.js';
import { isLineSibling } from './lib/taxonomy.js';
import { isSameLine } from './lib/line.js';
import { getCursorStateFromInput, getCursorStateFromSelection } from './lib/cursor.js';
import { CursorMotion } from './CursorMotion.js';
import { CursorTextOps } from './CursorTextOps.js';
import type { JsedDocument } from './types.js';
import type { UserInputSelectionState } from './UserInput.js';
import type { Tokenizer } from './Tokenizer.js';

export type CursorError =
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

/**
 * Options threaded through `setToken` -> `onCursorChange`. Cursor
 * is opaque to the contents; consumers (e.g. EditManager's handleCursorChange)
 * interpret them.
 */
export type SetTokenOpts = {
  /**
   * When false, the cursor-change listener should skip any user-facing
   * input-sync side effects (e.g. overwriting the input value). Internal
   * model updates (tokenizer keep-alive, nav focus) still fire.
   * Default: true.
   */
  syncInput?: boolean;
};

export type CursorState =
  | 'CURSOR_APPEND'
  | 'CURSOR_PREPEND'
  | 'CURSOR_INSERT_AFTER'
  | 'CURSOR_INSERT_BEFORE'
  | 'CURSOR_OVERWRITE';

export type CursorParams = {
  document: JsedDocument;
  tokenizer: Tokenizer;
  token: HTMLElement;
  onCursorChange: (token: HTMLElement, opts?: SetTokenOpts) => void;
  onError: (err: CursorError) => void;
  /**
   * Suppress visible cursor side effects (JSED_CURSOR_CLASS and scroll-into-view).
   * Used by CursorSelection's head-cursor, which must not render a second caret.
   */
  silent?: boolean;
};

/**
 * Public CURSOR facade for the editing session.
 *
 * Cursor owns current CURSOR state. Movement and text editing
 * coordination are delegated to focused operation classes.
 */
export class Cursor {
  static create(params: CursorParams) {
    return new Cursor(params);
  }

  static createNull(params: CursorParams) {
    return new Cursor(params);
  }

  #token: HTMLElement;
  #document: JsedDocument;
  #onCursorChange: (token: HTMLElement, opts?: SetTokenOpts) => void;
  #silent: boolean;
  #focusClasses: string[] = [];

  readonly ops: CursorTextOps;
  private motion: CursorMotion;
  private onError: (err: CursorError) => void;

  constructor(params: CursorParams) {
    this.#token = params.token; // ts needs this before setToken
    this.#document = params.document;
    this.#onCursorChange = params.onCursorChange;
    this.onError = params.onError;
    this.#silent = params.silent ?? false;
    this.motion = CursorMotion.create({
      document: params.document,
      tokenizer: params.tokenizer
    });
    this.ops = CursorTextOps.create({
      cursor: this,
      tokenizer: params.tokenizer,
      onError: params.onError
    });
    this.setToken(params.token);
  }

  /** Destroy the current edit session. The instance cannot be used after this. */
  destroy() {
    this.clearMarkers();
    if (!this.#silent) {
      this.#token.classList.remove(JSED_CURSOR_CLASS);
    }
    this.removeAllFocusClasses();
  }

  /** Return the JsedDocument that owns this CURSOR session. */
  getDocument() {
    return this.#document;
  }

  /** Return the active LINE_SIBLING that the CURSOR is on. */
  getToken() {
    return this.#token;
  }

  /**
   * Set the active LINE_SIBLING for the CURSOR.
   *
   * The cursor change callback is fired after the DOM classes and scroll state
   * have been updated. `opts` is opaque to this class; it flows through to
   * the callback so callers can attach per-call hints (e.g. `syncInput`).
   */
  setToken(el: HTMLElement, opts?: SetTokenOpts) {
    if (!isLineSibling(el)) {
      this.onError({ type: 'invalid-token' });
      throw new Error(`Not a LINE_SIBLING`);
    }
    this.removeAllFocusClasses();
    if (!this.#silent) {
      this.#token.classList.remove(JSED_CURSOR_CLASS);
      el.classList.add(JSED_CURSOR_CLASS);
      this.getDocument().viewportScroller.scrollIntoViewIfHidden(el, { vertical: 'nearest' });
    }
    this.#token = el;
    this.#onCursorChange(el, opts);
  }

  // #region CURSOR_STATE

  private setMarker(className?: string): void {
    this.clearMarkers();
    if (className) {
      this.addFocusClasses(className);
    }
  }

  clearMarkers(): void {
    this.removeFocusClasses(
      CURSOR_INSERT_AFTER_CLASS,
      CURSOR_INSERT_BEFORE_CLASS,
      CURSOR_PREPEND_CLASS,
      CURSOR_APPEND_CLASS
    );
  }

  private addFocusClasses(...classNames: string[]) {
    this.#token.classList.add(...classNames);
    this.#focusClasses.push(...classNames);
  }

  private removeFocusClasses(...classNames: string[]) {
    this.#token.classList.remove(...classNames);
    this.#focusClasses = this.#focusClasses.filter((c) => !classNames.includes(c));
  }

  private removeAllFocusClasses() {
    this.#token.classList.remove(...this.#focusClasses);
    this.#focusClasses = [];
  }

  /** Update the current CURSOR_STATE marker. */
  setState(state: CursorState): void {
    switch (state) {
      case 'CURSOR_APPEND':
        this.setMarker(CURSOR_APPEND_CLASS);
        return;
      case 'CURSOR_PREPEND':
        this.setMarker(CURSOR_PREPEND_CLASS);
        return;
      case 'CURSOR_INSERT_AFTER':
        this.setMarker(CURSOR_INSERT_AFTER_CLASS);
        return;
      case 'CURSOR_INSERT_BEFORE':
        this.setMarker(CURSOR_INSERT_BEFORE_CLASS);
        return;
      case 'CURSOR_OVERWRITE':
        this.clearMarkers();
        return;
    }
  }

  /** Update CURSOR_STATE markers from the current input value. */
  setStateFromInput(input: string): void {
    this.setState(getCursorStateFromInput(input));
  }

  /** Update CURSOR_STATE markers from the current input selection. */
  setStateFromSelection(selection: UserInputSelectionState): void {
    this.setState(getCursorStateFromSelection(selection));
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

  /**
   * Move to next CURSOR target (LINE_SIBLING or first reachable in next LINE).
   */
  moveNext() {
    this.motion.moveNext(this);
  }

  /**
   * Move to previous CURSOR target (LINE_SIBLING or last reachable in previous LINE).
   */
  movePrevious() {
    this.motion.movePrevious(this);
  }

  /** Whether `tok` is on the same LINE as the cursor's TOKEN. */
  isSameLine(tok: HTMLElement) {
    return isSameLine(this.getToken(), tok);
  }
}
