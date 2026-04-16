import * as token from './lib/token.js';
import { isCursorTransparent, isIsland, isLineSibling, isToken } from './lib/taxonomy.js';
import {
  findNextLineCandidate,
  findPreviousLineCandidate,
  getNextLineSibling,
  getPreviousLineSibling,
  isSameLine
} from './lib/sibwalk.js';
import { findNextNode } from './lib/walk.js';
import { TokenCursorBase, type TokenCursorBaseParams } from './TokenCursorBase.js';

export type { TokenCursorError } from './TokenCursorBase.js';

/**
 * Manages the CURSOR — motion, editing, and CURSOR_STATE markers.
 */
export class TokenCursor extends TokenCursorBase {
  static create(params: TokenCursorBaseParams) {
    return new TokenCursor(params);
  }

  static createNull(params: TokenCursorBaseParams) {
    return new TokenCursor(params);
  }

  // #region Motion

  /** Move to next CURSOR target (LINE_SIBLING or first reachable in next LINE). */
  moveNext() {
    if (this.isInsertingBefore()) {
      this.clearMarkers();
      return;
    }

    const nextToken = getNextLineSibling(this.getToken());
    if (nextToken) {
      this.setToken(nextToken);
      return;
    }

    const crossLineTarget = this.findCrossLineTarget('next');
    if (crossLineTarget) {
      this.setToken(crossLineTarget);
      return;
    }
  }

  /** Move to previous CURSOR target (LINE_SIBLING or last reachable in previous LINE). */
  movePrevious() {
    if (this.isInsertingAfter()) {
      this.clearMarkers();
      return;
    }

    const prevToken = getPreviousLineSibling(this.getToken());
    if (prevToken) {
      this.setToken(prevToken);
      return;
    }

    const crossLineTarget = this.findCrossLineTarget('previous');
    if (crossLineTarget) {
      this.setToken(crossLineTarget);
      return;
    }
  }

  /**
   * Resolve a CURSOR target in the next/previous LINE, tokenizing on arrival.
   *
   * Forward: lands on the first reachable target in the next LINE.
   * Backward: lands on the last reachable target in the previous LINE.
   */
  private findCrossLineTarget(direction: 'next' | 'previous'): HTMLElement | null {
    const root = this.getDocument().root;
    const candidate =
      direction === 'next'
        ? findNextLineCandidate(this.getToken(), root)
        : findPreviousLineCandidate(this.getToken(), root);
    if (!candidate) return null;

    return direction === 'next'
      ? this.getTokenizer().tokenizeLineAt(candidate)
      : this.findLastCursorTarget(candidate);
  }

  /** Resolve a LINE_SIBLING/container to its last reachable CURSOR target in document order. */
  private findLastCursorTarget(el: HTMLElement): HTMLElement | null {
    if (isToken(el) || isIsland(el)) {
      return el;
    }

    // Ensure any reachable text content has been tokenized before we scan.
    this.getTokenizer().tokenizeLineAt(el);

    let last: HTMLElement | null = null;
    for (const node of findNextNode(el, el, {
      visit: isLineSibling,
      descend: (node) => node === el || isCursorTransparent(node)
    })) {
      const target = this.findLastCursorTarget(node as HTMLElement);
      if (target) {
        last = target;
      }
    }

    return last;
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

  /** Whether a space can be inserted immediately before the CURSOR. */
  canInsertSpaceBeforeCursor(): boolean {
    return token.canInsertSpaceBeforeToken(this.getToken());
  }

  /** Insert a space immediately before the CURSOR if possible. */
  insertSpaceBeforeCursor(): boolean {
    return !!token.insertSpaceBeforeToken(this.getToken());
  }

  /** Whether a space can be inserted immediately after the CURSOR. */
  canInsertSpaceAfterCursor(): boolean {
    return token.canInsertSpaceAfterToken(this.getToken());
  }

  /** Insert a space immediately after the CURSOR if possible. */
  insertSpaceAfterCursor(): boolean {
    return !!token.insertSpaceAfterToken(this.getToken());
  }

  /** Whether removable space exists immediately before the CURSOR. */
  canRemoveSpaceBeforeCursor(): boolean {
    return !!token.getRemovableSpaceBeforeToken(this.getToken());
  }

  /** Remove space immediately before the CURSOR if possible. */
  removeSpaceBeforeCursor(): boolean {
    return !!token.removeSpaceBeforeToken(this.getToken());
  }

  /** Whether removable space exists immediately after the CURSOR. */
  canRemoveSpaceAfterCursor(): boolean {
    return !!token.getRemovableSpaceAfterToken(this.getToken());
  }

  /** Remove space immediately after the CURSOR if possible. */
  removeSpaceAfterCursor(): boolean {
    return !!token.removeSpaceAfterToken(this.getToken());
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
