import { ok, Result } from 'neverthrow';
import { isToken } from '../dom/taxonomy.js';
import type { EditorError, EditorState } from './EditorState.js';
import { CursorSelection } from '../cursor/CursorSelection.js';

/**
 * Manages an edit session for a single document.
 *
 * In 'view' mode, user navigates the document and EM will ensure the FOCUS is
 * tokenized so the user can focus the CURSOR at a TOKEN within the FOCUS.  Once
 * the CURSOR is created, EM goes into 'edit' mode and the CURSOR handles
 * tokenizing if it moves past the initial LINE it started on.
 *
 */
export class EditorOps {
  static create(state: EditorState): EditorOps {
    return new EditorOps(state);
  }

  static createNull(state: EditorState): EditorOps {
    return new EditorOps(state);
  }

  constructor(private state: EditorState) {}

  /**
   * Handle the user pressing Enter based on the current editing context.
   *
   * - view mode: enter edit mode from the current FOCUS
   * - edit mode on a TOKEN: split before the current TOKEN
   * - edit mode on a non-TOKEN target: descend into that target
   */
  handleEnter(): Result<void, EditorError> {
    // This allows us to edit via the "Edit..." menu .
    if (this.state.mode === 'view') {
      return this.state.enterEditing();
    }

    if (!this.state.cursor) {
      return this.state.enterEditing();
    }

    if (this.state.isSuspended) return ok(undefined);
    const current = this.state.cursor.getPlace();
    if (isToken(current)) {
      this.state.cursorOps.splitAtCursor();
      return ok(undefined);
    }

    return this.state.enterEditing(current);
  }

  handleExit({ softExit }: { softExit: boolean } = { softExit: true }) {
    if (this.state.selection) {
      // Cancel selection: collapse wrappers and land the CURSOR on the head
      // (wherever the selection was extended to). Keeps edit mode.
      this.cancelSelectionAt(this.state.selection.getHead());
      return;
    }
    if (this.state.mode === 'edit') {
      this.state.exitEditing({ softExit });
    }
  }

  /**
   * Collapse any active selection and move the CURSOR to `target`.
   * Returns true if a selection was cancelled. Stays in edit mode.
   */
  private cancelSelectionAt(target: HTMLElement): boolean {
    if (!this.state.selection) return false;
    this.state.selection.collapse();
    this.state.selection = undefined;
    this.state.cursor?.place(target);
    return true;
  }

  /**
   * Extend the SELECTION one LINE_SIBLING forward from the current CURSOR.
   *
   * Stub for the selections feature (work/active/20260414.feat.selections.md).
   * When implemented, this will seed a CursorSelection from the current TOKEN
   * on first call and grow (or shrink) its head via LINE_SIBLING traversal on
   * subsequent calls. Noop outside edit mode.
   */
  extendNext() {
    if (this.state.isSuspended) return;
    if (this.state.mode !== 'edit' || !this.state.cursor) return;
    if (!this.state.selection) {
      this.state.selection = CursorSelection.create({
        tokenizer: this.state.tokenizer,
        seed: this.state.cursor.getPlace(),
        document: this.state.document
      });
    }
    this.state.selection.extendNext();
  }

  /**
   * Extend the SELECTION one LINE_SIBLING backward from the current CURSOR.
   *
   * See `extendNext` for the full design sketch.
   */
  extendPrevious() {
    if (this.state.isSuspended) return;
    if (this.state.mode !== 'edit' || !this.state.cursor) return;
    if (!this.state.selection) {
      this.state.selection = CursorSelection.create({
        tokenizer: this.state.tokenizer,
        seed: this.state.cursor.getPlace(),
        document: this.state.document
      });
    }
    this.state.selection.extendPrevious();
  }

  movePrevious() {
    if (this.state.isSuspended) return;
    if (this.state.selection) {
      this.cancelSelectionAt(this.state.selection.getBackwardEnd());
      return;
    }
    if (this.state.mode === 'edit') {
      this.state.cursor?.movePrevious();
      return;
    }

    this.state.nav.UP_CHAIN();
  }

  moveNext() {
    if (this.state.isSuspended) return;
    if (this.state.selection) {
      this.cancelSelectionAt(this.state.selection.getForwardEnd());
      return;
    }
    if (this.state.mode === 'edit') {
      this.state.cursor?.moveNext();
      return;
    }

    this.state.nav.DOWN_CHAIN();
  }

  moveDown() {
    if (this.state.isSuspended) return;
    this.state.nav.SIB_NEXT();
  }

  moveUp() {
    if (this.state.isSuspended) return;
    this.state.nav.SIB_PREV();
  }

  scrollActiveTargetIntoView(): boolean {
    const current = this.state.cursor?.getPlace();
    if (current && isToken(current)) {
      this.state.document.viewportScroller.scrollIntoViewCentered(current);
      return true;
    }

    const focus = this.state.nav.getFocus();
    if (!focus) {
      return false;
    }

    this.state.document.viewportScroller.scrollIntoViewCentered(focus, {
      oversizedVertical: 'start'
    });
    return true;
  }
}
