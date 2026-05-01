import { getNextLineSibling, getPreviousLineSibling } from './lib/line.js';
import { isTokenizableTextNode } from './lib/taxonomy.js';
import type { Cursor } from './Cursor.js';
import type { Tokenizer } from './Tokenizer.js';
import type { JsedDocument } from './types.js';

/**
 * Coordinates CURSOR movement across LINE boundaries.
 *
 * Cursor owns the current CURSOR seat and visual state. CursorMotion owns
 * the movement policy that needs document structure plus SHALLOW_TOKENIZATION.
 */
export class CursorMotion {
  static create(params: { document: JsedDocument; tokenizer: Tokenizer }): CursorMotion {
    return new CursorMotion(params);
  }

  static createNull(params: { document: JsedDocument; tokenizer: Tokenizer }): CursorMotion {
    return new CursorMotion(params);
  }

  private constructor(private params: { document: JsedDocument; tokenizer: Tokenizer }) {}

  /**
   * Move to next CURSOR target (LINE_SIBLING or first reachable in next LINE).
   */
  moveNext(cursor: Cursor): void {
    if (cursor.isInsertingBefore()) {
      cursor.clearMarkers();
      return;
    }

    const next = getNextLineSibling(cursor.getToken(), this.params.document.root);
    if (!next) {
      return;
    }

    // We may get a text node because we do SHALLOW_TOKENIZATION.
    if (isTokenizableTextNode(next)) {
      const { tokens } = this.params.tokenizer.tokenizeLineAtTextNode(next);
      if (tokens[0]) {
        cursor.setToken(tokens[0]);
      }
      return;
    }

    cursor.setToken(next as HTMLElement);
  }

  /**
   * Move to previous CURSOR target (LINE_SIBLING or last reachable in previous LINE).
   */
  movePrevious(cursor: Cursor): void {
    if (cursor.isInsertingAfter()) {
      cursor.clearMarkers();
      return;
    }

    const prev = getPreviousLineSibling(cursor.getToken(), this.params.document.root);
    if (!prev) {
      return;
    }

    if (isTokenizableTextNode(prev)) {
      const { tokens } = this.params.tokenizer.tokenizeLineAtTextNode(prev);
      if (tokens.length > 0) {
        cursor.setToken(tokens[tokens.length - 1]);
      }
      return;
    }

    cursor.setToken(prev as HTMLElement);
  }
}
