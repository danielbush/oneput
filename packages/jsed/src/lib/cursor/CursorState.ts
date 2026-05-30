import { isLineSibling, isToken } from '../core/taxonomy.js';
import type { UserInputOpts, UserInputSelectionState } from '../input/UserInput.js';
import { isSameLine } from '../core/line.js';
import { CursorSelection } from './CursorSelection.js';
import type { EditorState } from '../editor/EditorState.js';
import { CursorTextOps } from './CursorTextOps.js';

export const CURSOR_APPEND_CLASS = 'jsed-crs-append';
export const CURSOR_PREPEND_CLASS = 'jsed-crs-prepend';
export const CURSOR_INSERT_AFTER_CLASS = 'jsed-crs-insert-after';
export const CURSOR_INSERT_BEFORE_CLASS = 'jsed-crs-insert-before';

/**
 * Indicates the input has a collapsed caret in its text (CURSOR_AT_BEGINNING /
 * _MIDDLE / _END), as opposed to a range or empty value. Drives the
 * underline-vs-background-pulse focus visual on the focused TOKEN.
 * Independent of the four marker classes above.
 */
export const CURSOR_CARET_CLASS = 'jsed-crs-caret';
/**
 * The focus CSS class for TOKEN's.
 */
export const JSED_CURSOR_CLASS = 'jsed-token-focus';

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

export type CursorParams = {};

export class CursorState {
  constructor(
    public editorState: EditorState,
    /**
     * The LINE_SIBLING the CURSOR is on.
     */
    private seat: HTMLElement,
    public onCursorChange: (token?: HTMLElement, opts?: UserInputOpts) => void,
    public onError: (err: CursorError) => void,
    public selection?: CursorSelection,
    private classes: string[] = [],
    /**
     * Last input selection state observed via setStateFromSelection. Used as
     * the model for visual derivation; reset on `place()` since a new TOKEN
     * starts a fresh editing session.
     */
    private lastSelection: UserInputSelectionState | null = null,
    /**
     * Last input value observed via setStateFromInput. Paired with
     * `#lastSelection` to derive the marker class.
     */
    private lastInputValue = ''
  ) {
    this.ops = CursorTextOps.create(this);
  }

  public ops: CursorTextOps;

  /** Return the active LINE_SIBLING that the CURSOR is on. */
  getPlace() {
    return this.seat;
  }

  /**
   * Set the active LINE_SIBLING for the CURSOR.
   *
   * The cursor change callback is fired after the DOM classes and scroll state
   * have been updated. `opts` is opaque to this class; it flows through to
   * the callback so callers can attach per-call hints (e.g. `syncInput`).
   */
  place(el: HTMLElement, opts?: UserInputOpts) {
    if (!isLineSibling(el)) {
      this.onError({ type: 'invalid-token' });
      throw new Error(`Not a LINE_SIBLING`);
    }
    this.removeAllClasses();
    this.seat = el;
    this.addClasses(JSED_CURSOR_CLASS);
    this.onCursorChange(el, opts);
  }

  /** Destroy the current edit session. The instance cannot be used after this. */
  destroy() {
    this.clearInsertState();
    this.removeAllClasses();
    this.onCursorChange();
  }

  reload() {
    this.place(this.getPlace());
  }

  startSelection() {
    if (!this.selection) {
      this.selection = CursorSelection.create({
        cursor: this,
        seed: this.seat,
        root: this.editorState.document.root
      });
    }
    return this.selection;
  }

  getSelection() {
    return this.selection;
  }

  cancelSelection(): boolean {
    if (!this.selection) return false;
    this.selection.destroy();
    this.selection = undefined;
    return true;
  }

  private addClasses(...classNames: string[]) {
    this.seat.classList.add(...classNames);
    this.classes.push(...classNames);
  }

  private removeClasses(...classNames: string[]) {
    this.seat.classList.remove(...classNames);
    this.classes = this.classes.filter((c) => !classNames.includes(c));
  }

  private removeAllClasses() {
    this.seat.classList.remove(...this.classes);
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

  // #region caret / selectAll

  /**
   * If off, typing will usually overwrite the whole token; if on, typing will
   * insert text in addition (like a normal caret would).
   *
   * This should map to whether the "user input" is in selectAll or not.
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
