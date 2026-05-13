import type { JsedDocument } from '../../JsedDocument';
import {
  CURSOR_APPEND_CLASS,
  CURSOR_CARET_CLASS,
  CURSOR_INSERT_AFTER_CLASS,
  CURSOR_INSERT_BEFORE_CLASS,
  CURSOR_PREPEND_CLASS,
  JSED_CURSOR_CLASS
} from '../dom/constants';
import { isSameLine } from '../dom/line';
import { isLineSibling, isToken } from '../dom/taxonomy';
import type { Tokenizer } from '../../Tokenizer';
import type { UserInputSelectionState } from '../../UserInput';

/**
 * Options threaded through `place` -> `onCursorChange`.
 */
export type CursorChangeOpts = {
  /**
   * When false, the cursor-change listener should skip any user-facing
   * input-sync side effects (e.g. overwriting the input value). Internal
   * model updates (tokenizer keep-alive, nav focus) still fire.
   * Used for mid-typing cursor re-seating so the user's in-flight input value
   * is not clobbered by the head TOKEN's pre-rewrite value.
   */
  syncInput?: boolean;
  inputCursorPosition?:
    | 'beginning'
    | 'end'
    | 'selectall'
    /**
     * Leave input caret wherever it currently is.
     */
    | 'nochange';
};

/**
 * The four CURSOR_STATE marker labels. A `null` state means "no marker" —
 * the previous default `CURSOR_OVERWRITE` was just an alias for that and
 * has been removed.
 */
export type CursorInsertState =
  | 'CURSOR_APPEND'
  | 'CURSOR_PREPEND'
  | 'CURSOR_INSERT_AFTER'
  | 'CURSOR_INSERT_BEFORE';

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

export type CursorParams = {
  document: JsedDocument;
  tokenizer: Tokenizer;
  token: HTMLElement;
  onCursorChange: (token: HTMLElement, opts?: CursorChangeOpts) => void;
  onError: (err: CursorError) => void;
  /**
   * Suppress visible cursor side effects (JSED_CURSOR_CLASS and scroll-into-view).
   * Used by CursorSelection's head-cursor, which must not render a second caret.
   */
  silent?: boolean;
};

export class CursorState {
  constructor(params: CursorParams) {
    this.token = params.token; // ts needs this before setToken
    this.document = params.document;
    this.onCursorChange = params.onCursorChange;
    this.onError = params.onError;
    this.silent = params.silent ?? false;
    this.tokenizer = params.tokenizer;
  }

  token: HTMLElement;
  document: JsedDocument;
  onCursorChange: (token: HTMLElement, opts?: CursorChangeOpts) => void;
  silent: boolean;
  classes: string[] = [];
  /**
   * Last input selection state observed via setStateFromSelection. Used as
   * the model for visual derivation; reset on `place()` since a new TOKEN
   * starts a fresh editing session.
   */
  lastSelection: UserInputSelectionState | null = null;
  /**
   * Last input value observed via setStateFromInput. Paired with
   * `#lastSelection` to derive the marker class.
   */
  lastInputValue = '';
  onError: (err: CursorError) => void;
  tokenizer: Tokenizer;

  /** Destroy the current edit session. The instance cannot be used after this. */
  destroy() {
    this.clearInsertState();
    if (!this.silent) {
      this.token.classList.remove(JSED_CURSOR_CLASS);
    }
    this.removeAllClasses();
  }

  /** Return the JsedDocument that owns this CURSOR session. */
  getDocument() {
    return this.document;
  }

  /** Return the active LINE_SIBLING that the CURSOR is on. */
  getPlace() {
    return this.token;
  }

  /**
   * Set the active LINE_SIBLING for the CURSOR.
   *
   * The cursor change callback is fired after the DOM classes and scroll state
   * have been updated. `opts` is opaque to this class; it flows through to
   * the callback so callers can attach per-call hints (e.g. `syncInput`).
   */
  place(el: HTMLElement, opts?: CursorChangeOpts) {
    if (!isLineSibling(el)) {
      this.onError({ type: 'invalid-token' });
      throw new Error(`Not a LINE_SIBLING`);
    }
    // Clear visual classes on the outgoing token but preserve the cached
    // selection / input value: those mirror the input element's state, which
    // is global across tokens. Resetting them would leave the new token in
    // bg-pulse until the next selection-change event arrives — and in flows
    // that don't fire one (e.g. setStateFromInput called after place during
    // insert-after-current), we'd miss the underline indefinitely.
    this.removeAllClasses();
    if (!this.silent) {
      this.token.classList.remove(JSED_CURSOR_CLASS);
      el.classList.add(JSED_CURSOR_CLASS);
      this.document.viewportScroller.scrollIntoViewIfHidden(el, {
        vertical: 'nearest'
      });
    }
    this.token = el;
    this.onCursorChange(el, opts);
  }

  reload() {
    this.place(this.getPlace()); // does select-all in input
  }

  private addClasses(...classNames: string[]) {
    this.token.classList.add(...classNames);
    this.classes.push(...classNames);
  }

  private removeClasses(...classNames: string[]) {
    this.token.classList.remove(...classNames);
    this.classes = this.classes.filter((c) => !classNames.includes(c));
  }

  private removeAllClasses() {
    this.token.classList.remove(...this.classes);
    this.classes = [];
  }

  /**
   * Notify Cursor that the input value changed. Updates the cached input
   * value and re-derives the marker (which depends on selection + value).
   * The caret indicator is unchanged — it depends on selection only.
   */
  setStateFromInput(input: string): void {
    this.lastInputValue = input;
    this.computeState();
  }

  /**
   * Notify Cursor that the input selection changed. Updates the cached
   * selection and re-derives both the caret indicator and the marker.
   */
  setStateFromSelection(selection: UserInputSelectionState): void {
    this.lastSelection = selection;
    this.computeState();
  }

  private computeState(): void {
    const { isCaret, insertMarker } = computeCursorState(this.lastSelection, this.lastInputValue);
    this.setCaret(isCaret);
    this.setInsertState(insertMarker);
  }

  // #region cursor insert state (CURSOR_STATE)

  clearInsertState(): void {
    this.removeClasses(
      CURSOR_INSERT_AFTER_CLASS,
      CURSOR_INSERT_BEFORE_CLASS,
      CURSOR_PREPEND_CLASS,
      CURSOR_APPEND_CLASS
    );
  }

  /** Update the current CURSOR_STATE marker. `null` clears all markers. */
  setInsertState(state: CursorInsertState | null): void {
    this.clearInsertState();
    switch (state) {
      case 'CURSOR_APPEND':
        this.addClasses(CURSOR_APPEND_CLASS);
        return;
      case 'CURSOR_PREPEND':
        this.addClasses(CURSOR_PREPEND_CLASS);
        return;
      case 'CURSOR_INSERT_AFTER':
        this.addClasses(CURSOR_INSERT_AFTER_CLASS);
        return;
      case 'CURSOR_INSERT_BEFORE':
        this.addClasses(CURSOR_INSERT_BEFORE_CLASS);
        return;
    }
  }

  isInInsertState() {
    return (
      this.isAppend() || this.isInsertingAfter() || this.isPrepend() || this.isInsertingBefore()
    );
  }

  /** Whether the CURSOR_STATE is CURSOR_APPEND on the current TOKEN. */
  isAppend(): boolean {
    return this.getPlace().classList.contains(CURSOR_APPEND_CLASS);
  }

  /** Whether the CURSOR_STATE is CURSOR_PREPEND on the current TOKEN. */
  isPrepend(): boolean {
    return this.getPlace().classList.contains(CURSOR_PREPEND_CLASS);
  }

  /** Whether the CURSOR_STATE is CURSOR_INSERT_AFTER on the current TOKEN. */
  isInsertingAfter(): boolean {
    return this.getPlace().classList.contains(CURSOR_INSERT_AFTER_CLASS);
  }

  /** Whether the CURSOR_STATE is CURSOR_INSERT_BEFORE on the current TOKEN. */
  isInsertingBefore(): boolean {
    return this.getPlace().classList.contains(CURSOR_INSERT_BEFORE_CLASS);
  }

  // #endregion

  // #region caret / select-all

  /**
   * If off, typing will usually overwrite the whole token; if on, typing will
   * insert text in addition (like a normal caret would).
   *
   * This should map to whether the "user input" is in select-all or not.
   */
  private setCaret(on: boolean): void {
    if (on) {
      if (!this.classes.includes(CURSOR_CARET_CLASS)) {
        this.addClasses(CURSOR_CARET_CLASS);
      }
    } else {
      this.removeClasses(CURSOR_CARET_CLASS);
    }
  }

  // #endregion

  /** Whether `tok` is on the same LINE as the cursor's TOKEN. */
  isSameLine(tok: HTMLElement) {
    return isSameLine(this.getPlace(), tok);
  }

  /** Guard: is the CURSOR currently on a TOKEN (not an ISLAND or other non-TOKEN LINE_SIBLING)? */
  isOnToken(): boolean {
    return isToken(this.getPlace());
  }
}

/**
 * Pure visual derivation for the focused TOKEN, computed from the current
 * input selection state and input value together.
 *
 * - `caret` is true when the input has a collapsed caret in its text
 *   (CURSOR_AT_BEGINNING / _MIDDLE / _END). Drives the underline indicator;
 *   false means bg-pulse.
 * - `marker` is the boundary marker for the four CURSOR_STATE labels.
 *   - AT_BEGINNING + leading space  → CURSOR_INSERT_BEFORE
 *   - AT_BEGINNING, no leading space → CURSOR_PREPEND
 *   - AT_END + trailing space        → CURSOR_INSERT_AFTER
 *   - AT_END, no trailing space      → CURSOR_APPEND
 *   - anything else                  → null (clear markers)
 *
 * `selection` may be null when no selection state has been observed yet
 * (e.g. immediately after the cursor was placed on a new TOKEN).
 */
export function computeCursorState(
  selection: UserInputSelectionState | null,
  userInput: string
): { isCaret: boolean; insertMarker: CursorInsertState | null } {
  const isCaret =
    selection === 'CURSOR_AT_BEGINNING' ||
    selection === 'CURSOR_AT_MIDDLE' ||
    selection === 'CURSOR_AT_END';

  let insertMarker: CursorInsertState | null = null;
  if (selection === 'CURSOR_AT_BEGINNING') {
    insertMarker = userInput.startsWith(' ') ? 'CURSOR_INSERT_BEFORE' : 'CURSOR_PREPEND';
  } else if (selection === 'CURSOR_AT_END') {
    insertMarker = userInput.endsWith(' ') ? 'CURSOR_INSERT_AFTER' : 'CURSOR_APPEND';
  }

  return { isCaret, insertMarker };
}
