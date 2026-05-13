import type { CursorState } from './CursorState.js';
import { getNextLineSibling, getPreviousLineSibling } from '../dom/line.js';
import { isTokenizableTextNode } from '../dom/taxonomy.js';

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

  static createNull(state: CursorState): CursorMotion {
    return new CursorMotion(state);
  }

  private constructor(private state: CursorState) {}

  /**
   * Move to next CURSOR target (LINE_SIBLING or first reachable in next LINE).
   */
  moveNext(): void {
    if (this.state.isInsertingBefore()) {
      this.state.clearInsertState();
      return;
    }

    const next = getNextLineSibling(this.state.getPlace(), this.state.document.root);
    if (!next) {
      return;
    }

    // We may get a text node because we do SHALLOW_TOKENIZATION.
    if (isTokenizableTextNode(next)) {
      const { tokens } = this.state.tokenizer.tokenizeLineAtTextNode(next);
      if (tokens[0]) {
        this.state.place(tokens[0]);
      }
      return;
    }

    this.state.place(next as HTMLElement);
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

    const prev = getPreviousLineSibling(this.state.getPlace(), this.state.document.root);
    if (!prev) {
      return;
    }

    if (isTokenizableTextNode(prev)) {
      const { tokens } = this.state.tokenizer.tokenizeLineAtTextNode(prev);
      if (tokens.length > 0) {
        this.state.place(tokens[tokens.length - 1]);
      }
      return;
    }

    this.state.place(prev as HTMLElement);
  }
}
