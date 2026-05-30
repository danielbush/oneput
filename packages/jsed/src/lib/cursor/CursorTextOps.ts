import * as token from '../ops/token.js';
import * as space from '../ops/space.js';
import { isAnchor, isLineSibling, isToken, isTokenizableTextNode } from '../core/taxonomy.js';
import type { CursorState } from './CursorState.js';
import type { UserInputOpts } from '../input/UserInput.js';
import {
  deleteHighestEmpty,
  isEmpty,
  recSplitAfterChild,
  recSplitBeforeChild
} from '../ops/focusable.js';
import {
  getFirstLineSibling,
  getLine,
  getNextLineSibling,
  getPreviousLineSibling
} from '../core/line.js';
import { addAnchorsToTag } from '../ops/anchor.js';
import type { UndoRecord } from '../undo/UndoRecorder.js';
import { getWrapCandidates } from '../core/dom-rules.js';

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
  static create(cursor: CursorState): CursorTextOps {
    return new CursorTextOps(cursor);
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
  moveNext(isSelection = false): void {
    if (this.state.selection && !isSelection) {
      this.state.cancelSelection();
      return;
    }
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
  movePrevious(isSelection = false): void {
    if (this.state.selection && !isSelection) {
      this.state.cancelSelection();
      return;
    }
    // Cancel append or insertAfter states and re-select token.
    if (this.state.isInsertingAfter() || this.state.isAppend()) {
      this.state.clearInsertState();
      this.state.place(this.state.getPlace());
      return;
    }
    const prev = this.getPrevious();
    if (prev) this.state.place(prev);
  }

  /** Delete the current TOKEN. */
  delete({ type }: CursorDeleteOpts = { type: 'tokenDeletion' }) {
    if (!this.state.isOnToken()) return;

    const current = this.state.getPlace();
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
        this.state.place(anchor, userInputOpts);
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
      this.state.place((prevCrs || nextCrs) as HTMLElement, userInputOpts);
      return undo;
    }

    /**
     * Move the cursor if we can.
     * ...<em>...</em>[A]</p> => ...<em>...[T]</em>A</p>
     * etc
     */
    this.state.place(prevCrs || nextCrs || current, userInputOpts);
    return undo;
  }

  /**
   * Similar to insertTextAfter.
   */
  replaceWithText(text: string, opts?: UserInputOpts) {
    if (!this.state.isOnToken()) return;
    const currentToken = this.state.getPlace();
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
    this.state.place(lastToken, opts);
    return undo;
  }

  /**
   * Insert string vals after cursor and put cursor on last one.
   */
  insertTextAfter(text: string, opts?: UserInputOpts) {
    const currentToken = this.state.getPlace();
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
      this.state.place(lastToken, opts);
    }
    return undo;
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

  /**
   * Extend the SELECTION one LINE_SIBLING forward from the current CURSOR.
   *
   * Stub for the selections feature (work/active/20260414.feat.selections.md).
   * When implemented, this will seed a CursorSelection from the current TOKEN
   * on first call and grow (or shrink) its head via LINE_SIBLING traversal on
   * subsequent calls. Noop outside edit mode.
   */
  extendNext() {
    const selection = this.state.startSelection();
    selection.extendNext();
  }

  /**
   * Extend the SELECTION one LINE_SIBLING backward from the current CURSOR.
   *
   * See `extendNext` for the full design sketch.
   */
  extendPrevious() {
    const selection = this.state.startSelection();
    selection.extendPrevious();
  }

  canWrap(): boolean {
    return isLineSibling(this.state.getPlace());
  }

  getWrapCandidates(): string[] {
    return getWrapCandidates();
  }

  /**
   * Wrap token at CURSOR or selection in a tag.
   */
  wrap(tagName: string): boolean {
    if (!this.canWrap) {
      return false;
    }
    const selection = this.state.getSelection();
    if (selection) {
      const wrappers = selection.wrapWithTag(tagName);
      if (!wrappers) {
        return false;
      }
      this.state.cancelSelection();

      for (const wrapper of wrappers) {
        this.state.eventsEmitter.onElementChange?.({
          type: 'focusable-inserted',
          element: wrapper
        });
      }
      return true;
    }

    const current = this.state.getPlace();
    const wrapper = token.wrapLineSiblingWithTag(current, tagName);
    if (!wrapper) {
      return false;
    }

    this.state.eventsEmitter.onElementChange?.({ type: 'focusable-inserted', element: wrapper });
    this.state.place(current);
    return true;
  }
}
