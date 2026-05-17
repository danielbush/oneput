import * as token from '../token/token.js';
import * as space from '../token/space.js';
import { isToken } from '../core/taxonomy.js';
import type { CursorState } from './CursorState.js';
import type { UserInputOpts } from '../input/UserInput.js';
import { deleteHighestEmptyTree } from '../focus/focusable.js';

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

    const [prevElementSib, nextElementSib] = token.remove(current);

    if (!prevCrs && !nextCrs) {
      // There's no prevCrs or nextCrs position We'll place the CURSOR on an
      // anchor so it has somewhere to go.
      const anchor = token.createAnchor();
      if (prevElementSib) {
        token.insertAfter(anchor, prevElementSib);
      } else if (nextElementSib) {
        token.insertBefore(anchor, nextElementSib);
      } else {
        token.append(anchor, parentNode);
      }
      this.state.place(anchor, userInputOpts);
      return;
    }

    if (!prevElementSib && !nextElementSib) {
      let p: HTMLElement | null = parentNode.parentNode as HTMLElement;
      token.removeParent(parentNode);
      deleteHighestEmptyTree(p, this.state.document.root);
    }

    this.state.place((prevCrs || nextCrs) as HTMLElement, userInputOpts);
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
  private splitBefore(): HTMLElement | null {
    if (!this.state.isOnToken()) return null;
    const [before] = token.splitBefore(this.state.getPlace());
    // We may end up in a new token, so we need to update the focus.
    this.state.place(this.state.getPlace());
    return before;
  }

  /** Perform SPLIT_BY_TOKEN after the current TOKEN. */
  private splitAfter(): HTMLElement | null {
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
