import * as token from '../token/token.js';
import * as space from '../token/space.js';
import { isAnchor, isToken, isTokenizableTextNode } from '../core/taxonomy.js';
import type { Cursor } from './Cursor.js';
import type { UserInputOpts } from '../input/UserInput.js';
import {
  deleteHighestEmpty,
  isEmpty,
  recSplitAfterChild,
  recSplitBeforeChild
} from '../focus/focusable.js';
import {
  getFirstLineSibling,
  getLine,
  getNextLineSibling,
  getPreviousLineSibling
} from '../core/line.js';
import { addAnchorsToTag } from '../token/anchor.js';
import type { UndoRecord } from '../undo/UndoRecorder.js';
import type { EditorState } from '../editor/EditorState.js';

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
  static create(state: EditorState, cursor: Cursor): CursorTextOps {
    return new CursorTextOps(state, cursor);
  }

  private constructor(
    private state: EditorState,
    private cursor: Cursor
  ) {}

  getNext(): HTMLElement | null {
    const next = getNextLineSibling(this.cursor.getPlace(), this.state.document.root);
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
    if (this.cursor.isInsertingBefore()) {
      this.cursor.clearInsertState();
      return;
    }

    const next = this.getNext();
    if (next) this.cursor.place(next);
  }

  getPrevious(): HTMLElement | null {
    const prev = getPreviousLineSibling(this.cursor.getPlace(), this.state.document.root);
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
    if (this.cursor.isInsertingAfter() || this.cursor.isAppend()) {
      this.cursor.clearInsertState();
      this.cursor.place(this.cursor.getPlace());
      return;
    }
    const prev = this.getPrevious();
    if (prev) this.cursor.place(prev);
  }

  /** Delete the current TOKEN. */
  delete({ type }: CursorDeleteOpts = { type: 'tokenDeletion' }) {
    if (!this.cursor.isOnToken()) return;

    const current = this.cursor.getPlace();
    const currIsAnchor = isAnchor(current);
    const prevCrs = this.getPrevious();
    const undo: UndoRecord = { ops: [] };
    let anchor: HTMLElement | null = null;

    // !prevCrs = we hit the beginning of all editable text
    // Go into selectAll mode rather than keeping a caret.

    const userInputOpts: UserInputOpts = {
      inputCursorPosition: type === 'tokenDeletion' || !prevCrs ? 'selectAll' : 'end'
    };

    // Delete if not an ANCHOR.

    if (!currIsAnchor) {
      undo.ops.push({ action: 'place-cursor', target: current });
      const result = token.remove(current);
      undo.ops.push(result);
      if (result.action === 'anchorize-token') {
        anchor = result.anchor;
        this.cursor.place(anchor, userInputOpts);
        return undo;
      }
    }

    // We're trying to delete at an ANCHOR...

    if (!current.parentElement) {
      // TODO: Editor will have to handle this gracefully.
      throw new Error('deleting LINE_SIBLING that is disconnected');
    }

    const nextCrs = this.getNext();
    const noMoreLineSiblings = !prevCrs && !nextCrs;
    const emptyParent = isEmpty(current.parentElement, true);

    // Delete tag around ANCHOR + possibly its ancestors...

    const canDeleteAncestors = currIsAnchor && emptyParent && !noMoreLineSiblings;
    if (canDeleteAncestors) {
      const op = deleteHighestEmpty(current.parentElement, this.state.document.root);
      if (op) {
        undo.ops.push({ action: 'place-cursor', target: current });
        undo.ops.push(op);
      }
      this.cursor.place((prevCrs || nextCrs) as HTMLElement, userInputOpts);
      return undo;
    }

    /**
     * Move the cursor if we can.
     * ...<em>...</em>[A]</p> => ...<em>...[T]</em>A</p>
     * etc
     */
    this.cursor.place(prevCrs || nextCrs || current, userInputOpts);
    return undo;
  }

  /**
   * Similar to insertTextAfter.
   */
  replaceWithText(text: string, opts?: UserInputOpts) {
    if (!this.cursor.isOnToken()) return;
    const currentToken = this.cursor.getPlace();
    const [firstPart, ...parts] = text.split(/\s+/).filter(Boolean);
    if (!firstPart) return;

    const undo: UndoRecord = { ops: [] };
    const result = token.replaceText(currentToken, firstPart);

    // Undo ops get played in reverse.
    // Some of the ops that will be pushed below may also place the cursor.
    undo.ops.push({ action: 'place-cursor', target: currentToken });
    undo.ops.push(result);

    let lastToken: HTMLElement = currentToken;
    for (const part of parts.reverse()) {
      const insertedToken = token.createToken(part);
      const result = token.insertAfter(insertedToken, currentToken);
      undo.ops.push(result);
      if (lastToken === currentToken) {
        lastToken = insertedToken;
      }
    }
    this.cursor.place(lastToken, opts);
    return undo;
  }

  /**
   * Insert string vals after cursor and put cursor on last one.
   */
  insertTextAfter(text: string, opts?: UserInputOpts) {
    const currentToken = this.cursor.getPlace();
    const undo: UndoRecord = { ops: [] };
    let lastToken: HTMLElement | null = null;
    const parts = text.split(/\s+/).filter(Boolean);
    for (const part of parts.reverse()) {
      const insertedToken = token.createToken(part);
      undo.ops.push({ action: 'place-cursor', target: currentToken });
      const result = token.insertAfter(insertedToken, currentToken);
      undo.ops.push(result);
      if (!lastToken) {
        lastToken = insertedToken;
      }
    }
    if (lastToken) {
      this.cursor.place(lastToken, opts);
    }
    return undo;
  }

  insertTextBefore(text: string, opts?: UserInputOpts): HTMLElement | null {
    const currentToken = this.cursor.getPlace();
    let lastToken: HTMLElement | null = null;
    const parts = text.split(/\s+/).filter(Boolean);
    for (const part of parts) {
      const insertedToken = token.createToken(part);
      token.insertBefore(insertedToken, currentToken);
      space.ensureSeparatorAfter(insertedToken);
      lastToken = insertedToken;
    }
    if (lastToken) {
      this.cursor.place(lastToken, opts);
    }
    return lastToken;
  }

  /** Merge with next adjacent TOKEN if it exists (JOIN). */
  joinNext(): void {
    if (!this.cursor.isOnToken()) return;
    token.joinNext(this.cursor.getPlace());
  }

  /** Merge with previous adjacent TOKEN if it exists (JOIN). */
  joinPrevious(): void {
    if (!this.cursor.isOnToken()) return;
    token.joinPrevious(this.cursor.getPlace());
  }

  /** Perform SPLIT_BY_TOKEN before the current TOKEN. */
  private splitBefore() {
    const child = this.cursor.getPlace();
    const line = getLine(child); // GOTCHA - always pre-calculate this, don't use in isCeiling below.
    const result = recSplitBeforeChild(child, (el) => el === line);
    // The original may need an ANCHOR becuase we could split before the first
    // child.
    addAnchorsToTag(result.bottomSplit.parent);
    return result;
  }

  /** Perform SPLIT_BY_TOKEN after the current TOKEN. */
  private splitAfter() {
    const child = this.cursor.getPlace();
    const line = getLine(child); // GOTCHA - always pre-calculate this, don't use in isCeiling below.
    const result = recSplitAfterChild(child, (el) => el === line);
    return result;
  }

  /** Perform SPLIT_BY_TOKEN according to CURSOR_STATE. */
  splitAtToken() {
    const splitBefore = this.cursor.isInsertingBefore() || this.cursor.isPrepend();
    const result = splitBefore ? this.splitBefore() : this.splitAfter();

    // We might have empty INLINE_FLOW peer, so let's anchor the lowest level.
    addAnchorsToTag(result.bottomSplit.peer);

    // Try to place the cursor on peer.
    const sib = getFirstLineSibling(result.topSplit.peer);
    if (sib) {
      this.cursor.place(sib);
    }

    return result;
  }

  insertElementAfter(el: HTMLElement): void {
    if (isToken(el)) {
      this.cursor.onError({ type: 'expected-non-token' });
      throw new Error(`Expected non-token element.`);
    }
    token.insertAfter(el, this.cursor.getPlace());

    const first = this.state.tokenizer.tokenizeLineAt(el);
    if (first) {
      this.cursor.place(first);
    }
  }

  insertElementBefore(el: HTMLElement): void {
    if (isToken(el)) {
      this.cursor.onError({ type: 'expected-non-token' });
      throw new Error(`Expected non-token element.`);
    }
    token.insertBefore(el, this.cursor.getPlace());

    const first = this.state.tokenizer.tokenizeLineAt(el);
    if (first) {
      this.cursor.place(first);
    }
  }
}
