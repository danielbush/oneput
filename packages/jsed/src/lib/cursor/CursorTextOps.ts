import { isLineSibling, isTokenizableTextNode } from '../core/taxonomy.js';
import type { CursorState } from './CursorState.js';
import { getNextLineSibling, getPreviousLineSibling } from '../core/line.js';
import { getWrapCandidates } from '../core/dom-rules.js';

/**
 * eg User is backspacing single chars.
 */
export type CharDeletion = 'charDeletion';
/**
 * User is deleteing whole tokens.
 */
export type TokenDeletion = 'tokenDeletion';
export type CursorDeleteOpts = { type: CharDeletion | TokenDeletion };

export class CursorTextOps {
  static create(cursor: CursorState): CursorTextOps {
    return new CursorTextOps(cursor);
  }

  private constructor(private state: CursorState) {}

  getNext(): HTMLElement | null {
    return this.getNextFrom(this.state.getPlace());
  }

  getNextFrom(from: HTMLElement): HTMLElement | null {
    const next = getNextLineSibling(from, this.state.document.root);
    if (!next) {
      return null;
    }

    // We may get a text node because we do SHALLOW_TOKENIZATION.
    if (isTokenizableTextNode(next)) {
      const { tokens } = this.state.tokenizer.tokenizeLineAtTextNode(next);
      if (tokens[0]) {
        return tokens[0];
      }
      return null;
    }
    return next as HTMLElement;
  }

  /**
   * Move to next CURSOR target (LINE_SIBLING or first reachable in next LINE).
   */
  moveNext(isSelection = false): void {
    if (this.state.selection && !isSelection) {
      this.state.collapseSelectionTo('forward');
      return;
    }
    if (this.state.isInsertingBefore()) {
      this.state.clearInsertState();
      return;
    }

    const next = this.getNext();
    // A selection-head walk must not repaint the input — leave it in the
    // anchor's state so typing over the SELECTION overwrites the range.
    if (next) this.state.place(next, isSelection ? { syncInput: false } : undefined);
  }

  getPrevious(): HTMLElement | null {
    return this.getPreviousFrom(this.state.getPlace());
  }

  getPreviousFrom(from: HTMLElement): HTMLElement | null {
    const prev = getPreviousLineSibling(from, this.state.document.root);
    if (!prev) {
      return null;
    }

    if (isTokenizableTextNode(prev)) {
      const { tokens } = this.state.tokenizer.tokenizeLineAtTextNode(prev);
      if (tokens.length > 0) {
        return tokens[tokens.length - 1];
      }
      return null;
    }

    return prev as HTMLElement;
  }

  /**
   * Move to previous CURSOR target (LINE_SIBLING or last reachable in previous LINE).
   */
  movePrevious(isSelection = false): void {
    if (this.state.selection && !isSelection) {
      this.state.collapseSelectionTo('backward');
      return;
    }
    // Cancel append or insertAfter states and re-select token.
    if (this.state.isInsertingAfter() || this.state.isAppend()) {
      this.state.clearInsertState();
      this.state.place(this.state.getPlace());
      return;
    }
    const prev = this.getPrevious();
    // See moveNext: keep the input on the anchor during a selection-head walk.
    if (prev) this.state.place(prev, isSelection ? { syncInput: false } : undefined);
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
    const selection = this.state.startSelection();
    selection.extendNext();
  }

  /**
   * Extend the SELECTION one LINE_SIBLING backward from the current CURSOR.
   *
   * See `extendNext` for the full design sketch.
   */
  extendPrevious() {
    const selection = this.state.startSelection();
    selection.extendPrevious();
  }

  canWrap(): boolean {
    return isLineSibling(this.state.getPlace());
  }

  getWrapCandidates(): string[] {
    return getWrapCandidates();
  }
}
