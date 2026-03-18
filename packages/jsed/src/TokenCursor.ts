import type { ITokenCursor } from './types.js';
import {
  CURSOR_APPEND_CLASS,
  CURSOR_PREPEND_CLASS,
  CURSOR_INSERT_AFTER_CLASS,
  CURSOR_INSERT_BEFORE_CLASS
} from './lib/constants.js';
import * as token from './lib/token.js';
import type { UserInputSelectionState } from './UserInput.js';
import { TokenCursorBase, type TokenCursorBaseParams } from './TokenCursorBase.js';

export type { TokenCursorError } from './TokenCursorBase.js';

/**
 * Manages the CURSOR — motion, editing, and CURSOR_STATE markers.
 */
export class TokenCursor extends TokenCursorBase implements ITokenCursor {
  static create(params: TokenCursorBaseParams) {
    return new TokenCursor(params);
  }

  // #region CURSOR_STATE

  public handleInputChange = (input: string): void => {
    if (input.endsWith(' ')) {
      this.setMarker(CURSOR_INSERT_AFTER_CLASS);
    } else if (input.startsWith(' ')) {
      this.setMarker(CURSOR_INSERT_BEFORE_CLASS);
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
        this.setMarker();
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

  private isInsertingAfter(): boolean {
    return this.getToken().classList.contains(CURSOR_INSERT_AFTER_CLASS);
  }

  private isInsertingBefore(): boolean {
    return this.getToken().classList.contains(CURSOR_INSERT_BEFORE_CLASS);
  }

  // #endregion

  // #region Motion

  moveNext() {
    if (this.isInsertingBefore()) {
      this.clearMarkers();
      return;
    }

    const nextToken = token.getNextLineSibling(this.getToken());
    if (nextToken) {
      this.setTokenInternal(nextToken);
    }
  }

  movePrevious() {
    if (this.isInsertingAfter()) {
      this.clearMarkers();
      return;
    }

    const prevToken = token.getPreviousLineSibling(this.getToken());
    if (prevToken) {
      this.setTokenInternal(prevToken);
    }
  }

  // #endregion

  // #region Editing tokens

  replace(val: string) {
    token.replaceText(this.getToken(), val);
  }

  delete() {
    const { next: nextTok } = token.remove(this.getToken());
    this.setTokenInternal(nextTok);
  }

  append(val: string): HTMLElement {
    const tok = token.createToken(val);
    token.insertAfter(tok, this.getToken());
    return tok;
  }

  /**
   * COLLAPSE the current token.
   */
  toggleCollapseNext() {
    if (token.isCollapsed(this.getToken())) {
      token.uncollapse(this.getToken());
      return false;
    } else {
      token.collapse(this.getToken());
      return true;
    }
  }

  /**
   * COLLAPSE the token previous to the current token.
   */
  toggleCollapsePrevious() {
    const prev = token.getPreviousLineSibling(this.getToken());
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
    token.joinNext(this.getToken());
  }

  joinPrevious() {
    token.joinPrevious(this.getToken());
  }

  splitBefore() {
    token.splitBefore(this.getToken());
    // We may end up in a new token, so we need to update the focus.
    this.setTokenInternal(this.getToken());
  }

  splitAfter() {
    const [, after] = token.splitAfter(this.getToken());
    const firstTok = this.tokenManager.tokenize(after);
    if (firstTok) {
      this.setTokenInternal(firstTok);
    }
  }

  // #endregion

  // #region Closing

  override close() {
    this.clearMarkers();
    super.close();
  }

  // #endregion

  // #region Other

  isSameLine(tok: HTMLElement) {
    return token.isSameLine(this.getToken(), tok);
  }

  // #endregion

  // #region Dom (non-token)

  /**
   * Focus on the new element anchor if there is one, else keep focused on
   * current token.
   */
  insertElementAfter(el: HTMLElement) {
    if (token.isToken(el)) {
      this.onError({ type: 'expected-non-token' });
      throw new Error(`Expected non-token element.`);
    }
    token.insertAfter(el, this.getToken());

    const first = this.tokenManager.tokenize(el);
    if (first) {
      this.setTokenInternal(first);
    }
  }

  /**
   * Focus on the new element anchor if there is one, else keep focused on
   * current token.
   */
  insertElementBefore(el: HTMLElement) {
    if (token.isToken(el)) {
      this.onError({ type: 'expected-non-token' });
      throw new Error(`Expected non-token element.`);
    }
    token.insertBefore(el, this.getToken());

    const first = this.tokenManager.tokenize(el);
    if (first) {
      this.setTokenInternal(first);
    }
  }

  // #endregion
}
