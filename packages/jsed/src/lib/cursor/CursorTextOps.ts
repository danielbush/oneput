import * as token from '../ops/token.js';
import { isLineSibling, isToken, isTokenizableTextNode } from '../core/taxonomy.js';
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

  /** Merge with next adjacent TOKEN if it exists (JOIN). */
  joinNext(): void {
    if (!this.state.isOnToken()) return;
    token.joinNext(this.state.getPlace());
  }

  /** Merge with previous adjacent TOKEN if it exists (JOIN). */
  joinPrevious(): void {
    if (!this.state.isOnToken()) return;
    token.joinPrevious(this.state.getPlace());
  }

  insertElementAfter(el: HTMLElement): void {
    if (isToken(el)) {
      this.state.onError({ type: 'expected-non-token' });
      throw new Error(`Expected non-token element.`);
    }
    token.insertAfter(el, this.state.getPlace());

    const first = this.state.tokenizer.tokenizeLineAt(el);
    if (first) {
      this.state.place(first);
    }
  }

  insertElementBefore(el: HTMLElement): void {
    if (isToken(el)) {
      this.state.onError({ type: 'expected-non-token' });
      throw new Error(`Expected non-token element.`);
    }
    token.insertBefore(el, this.state.getPlace());

    const first = this.state.tokenizer.tokenizeLineAt(el);
    if (first) {
      this.state.place(first);
    }
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

  /**
   * Wrap token at CURSOR or selection in a tag.
   */
  wrap(tagName: string): boolean {
    if (!this.canWrap) {
      return false;
    }
    const selection = this.state.getSelection();
    if (selection) {
      // Re-seat on the SELECTION's document-order start (as delete() does),
      // so wrapping is deterministic regardless of extension direction.
      const start = selection.getBackwardEnd();
      const wrappers = selection.wrapWithTag(tagName);
      if (!wrappers) {
        return false;
      }
      this.state.cancelSelection();

      for (const wrapper of wrappers) {
        this.state.eventsEmitter.onElementChange?.({
          type: 'focusable-inserted',
          element: wrapper
        });
      }
      this.state.place(start);
      return true;
    }

    const current = this.state.getPlace();
    const wrapper = token.wrapLineSiblingWithTag(current, tagName);
    if (!wrapper) {
      return false;
    }

    this.state.eventsEmitter.onElementChange?.({ type: 'focusable-inserted', element: wrapper });
    this.state.place(current);
    return true;
  }
}
