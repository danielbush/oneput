import type { CursorState } from './CursorState.js';
import { isTokenizableTextNode } from '../core/taxonomy.js';
import { getNextLineSibling, getPreviousLineSibling } from '../core/line.js';

/**
 * Coordinates CURSOR movement across LINE boundaries.
 *
 * Cursor owns the current CURSOR seat and visual state. CursorMotion owns
 * the movement policy that needs document structure plus SHALLOW_TOKENIZATION.
 */
export class CursorMotion {
  static create(state: CursorState): CursorMotion {
    return new CursorMotion(state);
  }

  private constructor(private state: CursorState) {}

  getNext(): HTMLElement | null {
    const next = getNextLineSibling(this.state.getPlace(), this.state.document.root);
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
  moveNext(): void {
    if (this.state.isInsertingBefore()) {
      this.state.clearInsertState();
      return;
    }

    const next = this.getNext();
    if (next) this.state.place(next);
  }

  getPrevious(): HTMLElement | null {
    const prev = getPreviousLineSibling(this.state.getPlace(), this.state.document.root);
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
  movePrevious(): void {
    // Cancel append or insertAfter states and re-select token.
    if (this.state.isInsertingAfter() || this.state.isAppend()) {
      this.state.clearInsertState();
      this.state.place(this.state.getPlace());
      return;
    }
    const prev = this.getPrevious();
    if (prev) this.state.place(prev);
  }
}
