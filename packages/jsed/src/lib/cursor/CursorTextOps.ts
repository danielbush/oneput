import * as token from '../token/token.js';
import * as space from '../token/space.js';
import { isAnchor, isLineSibling, isToken } from '../core/taxonomy.js';
import type { CursorState } from './CursorState.js';
import type { UserInputOpts } from '../input/UserInput.js';
import { deleteHighestEmpty, recSplitAfterChild, recSplitBeforeChild } from '../focus/focusable.js';
import { getNextElementSibling, getPreviousElementSibling } from '../core/sibling.js';
import { getFirstLineSibling, getLine } from '../core/line.js';
import { addAnchorsToTag, createAnchor } from '../token/anchor.js';
import type { UndoRecord } from '../undo/UndoRecorder.js';

export type CursorDeleteOpts = { type: 'charDeletion' | 'tokenDeletion' };

export class CursorTextOps {
  static create(state: CursorState): CursorTextOps {
    return new CursorTextOps(state);
  }

  private constructor(private state: CursorState) {}

  /** Delete the current TOKEN. */
  delete({ type }: CursorDeleteOpts = { type: 'tokenDeletion' }) {
    if (!this.state.isOnToken()) return;
    const current = this.state.getPlace();
    const prevCrs = this.state.motion.getPrevious();
    const nextCrs = this.state.motion.getNext();
    const parentNode = current.parentNode as HTMLElement;
    let inputCursorPosition: UserInputOpts['inputCursorPosition'] = 'end';
    if (type === 'tokenDeletion' || !prevCrs) {
      // !prevCrs = if we hit the beginning of all editable text, go into
      // selectAll mode; keeping a caret (if we were in one) doesn't make sense.
      // Other option is to do nothing an let the caret just sit.
      inputCursorPosition = 'selectAll';
    }
    const userInputOpts: UserInputOpts = { inputCursorPosition };
    const currIsAnchor = isAnchor(current);
    const prevElementSib = getPreviousElementSibling(current);
    const nextElementSib = getNextElementSibling(current);
    const willCreateEmptyDocument = !prevCrs && !nextCrs;
    /**
     * <p>[A]</p>
     * ...<em>[A]</em>...
     * => delete tag around ANCHOR + possibly more
     */
    const canDeleteAncestors =
      !prevElementSib && !nextElementSib && currIsAnchor && !willCreateEmptyDocument;
    /**
     * ...<em>...</em>[A]</p>
     * => ...<em>...[T]</em>[A]</p>
     */
    const skipAnchorDelete = currIsAnchor && !canDeleteAncestors;
    const canDeleteToken = !skipAnchorDelete;

    // Situations where we don't remove the token...

    // Perform removals...

    const undo: UndoRecord = { ops: [] };

    if (canDeleteToken) {
      undo.ops.push(token.remove(current));
    }
    if (canDeleteAncestors) {
      const op = deleteHighestEmpty(parentNode, this.state.document.root);
      if (op) undo.ops.push(op);
    }

    // Anchor and cursor placement....

    if (skipAnchorDelete) {
      if (prevCrs) {
        this.state.place(prevCrs, userInputOpts);
        return undo;
      }
      return undo;
    }

    if (canDeleteAncestors) {
      this.state.place((prevCrs || nextCrs) as HTMLElement, userInputOpts);
      return undo;
    }

    if (willCreateEmptyDocument) {
      // There's no prevCrs or nextCrs position We'll place the CURSOR on an
      // anchor so it has somewhere to go.
      const anchor = createAnchor();
      current.insertAdjacentElement('beforebegin', anchor);
      this.state.place(anchor, userInputOpts);
      return undo;
    }

    // <p>[T]A</p>
    // => <p>[A]</p>
    if (!prevElementSib && isAnchor(nextElementSib)) {
      this.state.place(nextElementSib!, userInputOpts);
      return undo;
    }

    // ...<em>...</em>T|</p>
    // => ...<em>...</em>[A]</p>
    if (prevElementSib && !isLineSibling(prevElementSib) && !isLineSibling(nextElementSib)) {
      const anchor = createAnchor();
      current.insertAdjacentElement('beforebegin', anchor);
      this.state.place(anchor, userInputOpts);
      return undo;
    }

    // ...<em>[T]</em>...</p>
    // => ...<em>[A]</em>...</p>
    if (!isLineSibling(prevElementSib) && !isLineSibling(nextElementSib)) {
      const anchor = createAnchor();
      current.insertAdjacentElement('beforebegin', anchor);
      this.state.place(anchor, userInputOpts);
      return undo;
    }

    this.state.place((prevCrs || nextCrs) as HTMLElement, userInputOpts);
    return undo;
  }

  /**
   * Similar to insertTextAfter.
   */
  replaceWithText(text: string, opts?: UserInputOpts): HTMLElement | null {
    if (!this.state.isOnToken()) return null;
    const currentToken = this.state.getPlace();
    const [firstPart, ...parts] = text.split(/\s+/).filter(Boolean);
    if (!firstPart) return null;

    token.replaceText(currentToken, firstPart);
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
  private splitBefore() {
    const child = this.state.getPlace();
    const line = getLine(child); // GOTCHA - always pre-calculate this, don't use in isCeiling below.
    const result = recSplitBeforeChild(child, (el) => el === line);
    // The original may need an ANCHOR becuase we could split before the first
    // child.
    addAnchorsToTag(result.bottomSplit.parent);
    return result;
  }

  /** Perform SPLIT_BY_TOKEN after the current TOKEN. */
  private splitAfter() {
    const child = this.state.getPlace();
    const line = getLine(child); // GOTCHA - always pre-calculate this, don't use in isCeiling below.
    const result = recSplitAfterChild(child, (el) => el === line);
    return result;
  }

  /** Perform SPLIT_BY_TOKEN according to CURSOR_STATE. */
  splitAtToken() {
    const splitBefore = this.state.isInsertingBefore() || this.state.isPrepend();
    const result = splitBefore ? this.splitBefore() : this.splitAfter();

    // We might have empty INLINE_FLOW peer, so let's anchor the lowest level.
    addAnchorsToTag(result.bottomSplit.peer);

    // Try to place the cursor on peer.
    const sib = getFirstLineSibling(result.topSplit.peer);
    if (sib) {
      this.state.place(sib);
    }

    return result;
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
