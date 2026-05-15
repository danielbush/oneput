import * as token from '../token/token.js';
import * as space from '../token/space.js';
import { isToken } from '../core/taxonomy.js';
import type { CursorState } from './CursorState.js';
import { deleteEmptyTree, type DeleteEmptyTreeResult } from '../focus/focusable.js';
import type { UserInputOpts } from '../input/UserInput.js';

export type CursorDeleteResult =
  | {
      type: 'cursor-delete-noop';
      undoable: false;
      reason: 'not-on-token';
    }
  | {
      type: 'cursor-delete';
      undoable: true;
      deletionType: 'charDeletion' | 'tokenDeletion';
      removedToken: token.TokenRemovalResult;
      insertedAnchor: token.TokenInsertionResult | null;
      removedParent: token.TokenParentRemovalResult | null;
      removedEmptyTree: DeleteEmptyTreeResult | null;
      cursorBefore: HTMLElement;
      cursorAfter: HTMLElement;
      inputCursorPosition: UserInputOpts['inputCursorPosition'];
    };

export type CursorDeleteOpts = { type: 'charDeletion' | 'tokenDeletion' };

export class CursorTextOps {
  static create(state: CursorState): CursorTextOps {
    return new CursorTextOps(state);
  }

  private constructor(private state: CursorState) {}

  /** Delete the current TOKEN. */
  delete({ type }: CursorDeleteOpts = { type: 'tokenDeletion' }): CursorDeleteResult {
    if (!this.state.isOnToken()) {
      return { type: 'cursor-delete-noop', undoable: false, reason: 'not-on-token' };
    }
    const current = this.state.getPlace();
    const prevCrs = this.state.motion.getPrevious();
    const nextCrs = this.state.motion.getNext();
    const parentNode = current.parentNode as HTMLElement;
    const removal = token.remove(current);
    const prevSibling = removal.previousVisibleSibling;
    const nextSibling = removal.nextVisibleSibling;
    let inputCursorPosition: UserInputOpts['inputCursorPosition'] = 'end';
    if (type === 'tokenDeletion' || !prevCrs) {
      // !prevCrs = if we hit the beginning of all editable text, go into
      // selectAll mode; keeping a caret (if we were in one) doesn't make sense.
      inputCursorPosition = 'selectAll';
    }
    const userInputOpts: UserInputOpts = { inputCursorPosition };

    // prev is NOT a token....

    let insertedAnchor: token.TokenInsertionResult | null = null;
    let removedParent: token.TokenParentRemovalResult | null = null;
    let removedEmptyTree: DeleteEmptyTreeResult | null = null;
    let cursorAfter: HTMLElement;

    if (!prevCrs && !nextCrs) {
      // There's no prevCrs or nextCrs position We'll place the CURSOR on an
      // anchor so it has somewhere to go.
      const anchor = token.createAnchor();
      if (prevSibling) {
        insertedAnchor = token.insertAfter(anchor, prevSibling);
      } else if (nextSibling) {
        insertedAnchor = token.insertBefore(anchor, nextSibling);
      } else {
        insertedAnchor = token.append(anchor, parentNode);
      }
      cursorAfter = anchor;
      this.state.place(anchor, userInputOpts);
      return {
        type: 'cursor-delete',
        undoable: true,
        deletionType: type,
        removedToken: removal,
        insertedAnchor,
        removedParent,
        removedEmptyTree,
        cursorBefore: current,
        cursorAfter,
        inputCursorPosition
      };
    }

    if (!prevSibling && !nextSibling) {
      let p: HTMLElement | null = parentNode.parentNode as HTMLElement;
      removedParent = token.removeParent(parentNode);
      removedEmptyTree = deleteEmptyTree(p, this.state.document.root);
    }

    cursorAfter = (prevCrs || nextCrs) as HTMLElement;
    this.state.place(cursorAfter, userInputOpts);
    return {
      type: 'cursor-delete',
      undoable: true,
      deletionType: type,
      removedToken: removal,
      insertedAnchor,
      removedParent,
      removedEmptyTree,
      cursorBefore: current,
      cursorAfter,
      inputCursorPosition
    };
  }

  /** Replace the value of the current TOKEN with a new value. */
  replace(val: string): void {
    if (!this.state.isOnToken()) return;
    token.replaceText(this.state.getPlace(), val);
  }

  /**
   * Similar to insertTextAfter.
   */
  replaceWithText(text: string, opts?: UserInputOpts): HTMLElement | null {
    if (!this.state.isOnToken()) return null;
    const currentToken = this.state.getPlace();
    const [firstPart, ...parts] = text.split(/\s+/).filter(Boolean);
    if (!firstPart) return null;

    this.replace(firstPart);
    let lastToken: HTMLElement = currentToken;
    for (const part of parts.reverse()) {
      const insertedToken = token.createToken(part);
      token.insertAfter(insertedToken, currentToken);
      space.ensureSeparatorAfter(currentToken);
      if (lastToken === currentToken) {
        lastToken = insertedToken;
      }
    }
    this.state.place(lastToken, opts);
    return lastToken;
  }

  /**
   * Insert string vals after cursor and put cursor on last one.
   *
   * Supports 'insert-after-current' operation (input intent).
   */
  insertTextAfter(text: string, opts?: UserInputOpts): HTMLElement | null {
    const currentToken = this.state.getPlace();
    let lastToken: HTMLElement | null = null;
    const parts = text.split(/\s+/).filter(Boolean);
    for (const part of parts.reverse()) {
      const insertedToken = token.createToken(part);
      token.insertAfter(insertedToken, currentToken);
      space.ensureSeparatorAfter(currentToken);
      if (!lastToken) {
        lastToken = insertedToken;
      }
    }
    if (lastToken) {
      this.state.place(lastToken, opts);
    }
    return lastToken;
  }

  insertTextBefore(text: string, opts?: UserInputOpts): HTMLElement | null {
    const currentToken = this.state.getPlace();
    let lastToken: HTMLElement | null = null;
    const parts = text.split(/\s+/).filter(Boolean);
    for (const part of parts) {
      const insertedToken = token.createToken(part);
      token.insertBefore(insertedToken, currentToken);
      space.ensureSeparatorAfter(insertedToken);
      lastToken = insertedToken;
    }
    if (lastToken) {
      this.state.place(lastToken, opts);
    }
    return lastToken;
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

  /** Perform SPLIT_BY_TOKEN before the current TOKEN. */
  splitBefore(): HTMLElement | null {
    if (!this.state.isOnToken()) return null;
    const [before] = token.splitBefore(this.state.getPlace());
    // We may end up in a new token, so we need to update the focus.
    this.state.place(this.state.getPlace());
    return before;
  }

  /** Perform SPLIT_BY_TOKEN after the current TOKEN. */
  splitAfter(): HTMLElement | null {
    if (!this.state.isOnToken()) return null;
    const [, after] = token.splitAfter(this.state.getPlace());
    const firstTok = this.state.tokenizer.tokenizeLineAt(after);
    if (firstTok) {
      this.state.place(firstTok);
    }
    return after;
  }

  /** Perform SPLIT_BY_TOKEN according to CURSOR_STATE. */
  splitAtToken(): HTMLElement | null {
    if (this.state.isInsertingBefore() || this.state.isPrepend()) {
      return this.splitBefore();
    }

    return this.splitAfter();
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
}
