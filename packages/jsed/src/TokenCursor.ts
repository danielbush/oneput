import type { ITokenCursor } from './types.js';
import {
  CURSOR_APPEND_CLASS,
  CURSOR_PREPEND_CLASS,
  CURSOR_INSERT_AFTER_CLASS,
  CURSOR_INSERT_BEFORE_CLASS
} from './lib/constants.js';
import * as token from './lib/token.js';
import { isToken } from './lib/taxonomy.js';
import { isSameLine, getNextLineSibling, getPreviousLineSibling } from './lib/sibwalk.js';
import type { UserInputSelectionState } from './UserInput.js';
import { TokenCursorBase, type TokenCursorBaseParams } from './TokenCursorBase.js';
import { quickDescend } from './index.js';

export type { TokenCursorError } from './TokenCursorBase.js';

/**
 * Manages the CURSOR — motion, editing, and CURSOR_STATE markers.
 */
export class TokenCursor extends TokenCursorBase implements ITokenCursor {
  static create(params: TokenCursorBaseParams) {
    return new TokenCursor(params);
  }

  static createNull(params: TokenCursorBaseParams) {
    return new TokenCursor(params);
  }

  // #region CURSOR_STATE

  public handleInputChange = (input: string): void => {
    if (input.endsWith(' ')) {
      this.setMarker(CURSOR_INSERT_AFTER_CLASS);
    } else if (input.startsWith(' ')) {
      this.setMarker(CURSOR_INSERT_BEFORE_CLASS);
    } else {
      this.clearMarkers();
    }
  };

  public handleSelectionChange = (selection: UserInputSelectionState): void => {
    switch (selection) {
      case 'CURSOR_AT_BEGINNING':
        this.setMarker(CURSOR_PREPEND_CLASS);
        return;
      case 'CURSOR_AT_END':
        this.setMarker(CURSOR_APPEND_CLASS);
        return;
      default:
        this.clearMarkers();
    }
  };

  private setMarker(className?: string): void {
    this.clearMarkers();
    if (className) {
      this.addFocusClasses(className);
    }
  }

  private clearMarkers(): void {
    this.removeFocusClasses(
      CURSOR_INSERT_AFTER_CLASS,
      CURSOR_INSERT_BEFORE_CLASS,
      CURSOR_PREPEND_CLASS,
      CURSOR_APPEND_CLASS
    );
  }

  /** Whether the CURSOR_STATE is CURSOR_APPEND on the current TOKEN. */
  isAppend(): boolean {
    return this.getToken().classList.contains(CURSOR_APPEND_CLASS);
  }

  /** Whether the CURSOR_STATE is CURSOR_PREPEND on the current TOKEN. */
  isPrepend(): boolean {
    return this.getToken().classList.contains(CURSOR_PREPEND_CLASS);
  }

  /** Whether the CURSOR_STATE is CURSOR_INSERT_AFTER on the current TOKEN. */
  isInsertingAfter(): boolean {
    return this.getToken().classList.contains(CURSOR_INSERT_AFTER_CLASS);
  }

  /** Whether the CURSOR_STATE is CURSOR_INSERT_BEFORE on the current TOKEN. */
  isInsertingBefore(): boolean {
    return this.getToken().classList.contains(CURSOR_INSERT_BEFORE_CLASS);
  }

  // #endregion

  // #region Motion

  moveNext() {
    if (this.isInsertingBefore()) {
      this.clearMarkers();
      return;
    }

    const nextToken = getNextLineSibling(this.getToken());
    if (nextToken) {
      this.setToken(nextToken);
    }
  }

  movePrevious() {
    if (this.isInsertingAfter()) {
      this.clearMarkers();
      return;
    }

    const prevToken = getPreviousLineSibling(this.getToken());
    if (prevToken) {
      this.setToken(prevToken);
    }
  }

  // #endregion

  // #region Editing tokens

  /** Guard: is the CURSOR currently on a TOKEN (not an ISLAND or other non-TOKEN LINE_SIBLING)? */
  private isOnToken(): boolean {
    return isToken(this.getToken());
  }

  replace(val: string) {
    if (!this.isOnToken()) return;
    token.replaceText(this.getToken(), val);
  }

  delete() {
    if (!this.isOnToken()) return;
    const { next: nextTok } = token.remove(this.getToken());
    this.setToken(nextTok);
  }

  append(val: string): HTMLElement | null {
    if (!this.isOnToken()) return null;
    const current = this.getToken();
    const tok = token.createToken(val);
    token.insertAfter(tok, current);
    token.uncollapse(current);
    return tok;
  }

  /**
   * TOGGLE_COLLAPSE on the TOKEN
   */
  toggleCollapseNext() {
    if (!this.isOnToken()) return false;
    if (token.isCollapsed(this.getToken())) {
      token.uncollapse(this.getToken());
      return false;
    } else {
      token.collapse(this.getToken());
      return true;
    }
  }

  /**
   * TOGGLE_COLLAPSE on the TOKEN previous to the current TOKEN.
   */
  toggleCollapsePrevious() {
    if (!this.isOnToken()) return false;
    const prev = getPreviousLineSibling(this.getToken());
    if (!prev) {
      return false;
    }
    if (token.isCollapsed(prev)) {
      token.uncollapse(prev);
      return false;
    } else {
      token.collapse(prev);
      return true;
    }
  }

  joinNext() {
    if (!this.isOnToken()) return;
    token.joinNext(this.getToken());
  }

  joinPrevious() {
    if (!this.isOnToken()) return;
    token.joinPrevious(this.getToken());
  }

  splitBefore(): HTMLElement | null {
    if (!this.isOnToken()) return null;
    const [before] = token.splitBefore(this.getToken());
    // We may end up in a new token, so we need to update the focus.
    this.setToken(this.getToken());
    return before;
  }

  splitAfter(): HTMLElement | null {
    if (!this.isOnToken()) return null;
    const [, after] = token.splitAfter(this.getToken());
    const firstTok = quickDescend(after);
    if (firstTok) {
      this.setToken(firstTok);
    }
    return after;
  }

  splitAtToken(): HTMLElement | null {
    if (this.isInsertingAfter() || this.isAppend()) {
      return this.splitAfter();
    }

    return this.splitBefore();
  }

  // #endregion

  // #region Destroy

  override destroy() {
    this.clearMarkers();
    super.destroy();
  }

  // #endregion

  // #region Other

  isSameLine(tok: HTMLElement) {
    return isSameLine(this.getToken(), tok);
  }

  // #endregion

  // #region Dom (non-token)

  /**
   * Focus on the new element anchor if there is one, else keep focused on
   * current token.
   */
  insertElementAfter(el: HTMLElement) {
    if (isToken(el)) {
      this.onError({ type: 'expected-non-token' });
      throw new Error(`Expected non-token element.`);
    }
    token.insertAfter(el, this.getToken());

    const first = quickDescend(el);
    if (first) {
      this.setToken(first);
    }
  }

  /**
   * Focus on the new element anchor if there is one, else keep focused on
   * current token.
   */
  insertElementBefore(el: HTMLElement) {
    if (isToken(el)) {
      this.onError({ type: 'expected-non-token' });
      throw new Error(`Expected non-token element.`);
    }
    token.insertBefore(el, this.getToken());

    const first = quickDescend(el);
    if (first) {
      this.setToken(first);
    }
  }

  // #endregion
}
