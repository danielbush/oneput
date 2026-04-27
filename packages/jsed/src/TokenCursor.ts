import * as token from './lib/token.js';
import { isToken, isTokenizableTextNode } from './lib/taxonomy.js';
import { getNextLineSibling, getPreviousLineSibling, isSameLine } from './lib/sibwalk.js';
import { TokenCursorBase, type TokenCursorBaseParams } from './TokenCursorBase.js';

export type { TokenCursorError } from './TokenCursorBase.js';

/**
 * Manages moving the CURSOR and ensuring beforehand that nearby DOM is
 * tokenized via the Tokenizer.
 */
export class TokenCursor extends TokenCursorBase {
  static create(params: TokenCursorBaseParams) {
    return new TokenCursor(params);
  }

  static createNull(params: TokenCursorBaseParams) {
    return new TokenCursor(params);
  }

  // #region Motion

  /**
   * Move to next CURSOR target (LINE_SIBLING or first reachable in next LINE).
   */
  moveNext() {
    if (this.isInsertingBefore()) {
      this.clearMarkers();
      return;
    }

    const next = getNextLineSibling(this.getToken(), this.getDocument().root);
    if (!next) {
      return;
    }
    // We may get a text node because we do SHALLOW_TOKENIZATION.
    if (isTokenizableTextNode(next)) {
      const { tokens } = this.getTokenizer().tokenizeLineAtTextNode(next);
      if (tokens[0]) {
        this.setToken(tokens[0]);
      }
      return;
    }
    this.setToken(next as HTMLElement);
  }

  /**
   * Move to previous CURSOR target (LINE_SIBLING or last reachable in previous LINE).
   */
  movePrevious() {
    if (this.isInsertingAfter()) {
      this.clearMarkers();
      return;
    }

    const prev = getPreviousLineSibling(this.getToken(), this.getDocument().root);
    if (!prev) {
      return;
    }
    if (isTokenizableTextNode(prev)) {
      const { tokens } = this.getTokenizer().tokenizeLineAtTextNode(prev);
      if (tokens.length > 0) {
        this.setToken(tokens[tokens.length - 1]);
      }
      return;
    }

    this.setToken(prev as HTMLElement);
  }

  // #endregion

  // #region Editing tokens

  /** Guard: is the CURSOR currently on a TOKEN (not an ISLAND or other non-TOKEN LINE_SIBLING)? */
  private isOnToken(): boolean {
    return isToken(this.getToken());
  }

  /** Replace the value of the current TOKEN with a new value. */
  replace(val: string) {
    if (!this.isOnToken()) return;
    token.replaceText(this.getToken(), val);
  }

  /** Delete the current TOKEN. */
  delete() {
    if (!this.isOnToken()) return;
    const { next: nextTok } = token.remove(this.getToken());
    this.setToken(nextTok);
  }

  /** Append a new TOKEN after the current one. */
  append(val: string): HTMLElement | null {
    if (!this.isOnToken()) return null;
    const current = this.getToken();
    const tok = token.createToken(val);
    token.insertAfter(tok, current);
    token.ensureSeparatorAfter(current);
    return tok;
  }

  /** Merge with next adjacent TOKEN if it exists (JOIN). */
  joinNext() {
    if (!this.isOnToken()) return;
    token.joinNext(this.getToken());
  }

  /** Merge with previous adjacent TOKEN if it exists (JOIN). */
  joinPrevious() {
    if (!this.isOnToken()) return;
    token.joinPrevious(this.getToken());
  }

  /** Perform SPLIT_BY_TOKEN before the current TOKEN. */
  splitBefore(): HTMLElement | null {
    if (!this.isOnToken()) return null;
    const [before] = token.splitBefore(this.getToken());
    // We may end up in a new token, so we need to update the focus.
    this.setToken(this.getToken());
    return before;
  }

  /** Perform SPLIT_BY_TOKEN after the current TOKEN. */
  splitAfter(): HTMLElement | null {
    if (!this.isOnToken()) return null;
    const [, after] = token.splitAfter(this.getToken());
    const firstTok = this.getTokenizer().tokenizeLineAt(after);
    if (firstTok) {
      this.setToken(firstTok);
    }
    return after;
  }

  /** Perform SPLIT_BY_TOKEN according to CURSOR_STATE. */
  splitAtToken(): HTMLElement | null {
    if (this.isInsertingAfter() || this.isAppend()) {
      return this.splitAfter();
    }

    return this.splitBefore();
  }

  // #endregion

  // #region Other

  /** Whether `tok` is on the same LINE as the cursor's TOKEN. */
  isSameLine(tok: HTMLElement) {
    return isSameLine(this.getToken(), tok);
  }

  // #endregion

  // #region Dom (non-token)

  /**
   * Insert a non-TOKEN element after the current TOKEN and focus its first
   * editable LINE_SIBLING if one exists.
   */
  insertElementAfter(el: HTMLElement) {
    if (isToken(el)) {
      this.onError({ type: 'expected-non-token' });
      throw new Error(`Expected non-token element.`);
    }
    token.insertAfter(el, this.getToken());

    const first = this.getTokenizer().tokenizeLineAt(el);
    if (first) {
      this.setToken(first);
    }
  }

  /**
   * Insert a non-TOKEN element before the current TOKEN and focus its first
   * editable LINE_SIBLING if one exists.
   */
  insertElementBefore(el: HTMLElement) {
    if (isToken(el)) {
      this.onError({ type: 'expected-non-token' });
      throw new Error(`Expected non-token element.`);
    }
    token.insertBefore(el, this.getToken());

    const first = this.getTokenizer().tokenizeLineAt(el);
    if (first) {
      this.setToken(first);
    }
  }

  // #endregion
}
