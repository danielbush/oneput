import * as token from '../dom/token.js';
import * as space from '../dom/space.js';
import { isToken } from '../dom/taxonomy.js';
import type { CursorChangeOpts, CursorState } from './CursorState.js';
import { isEmpty } from '../dom/focusable.js';

export class CursorTextOps {
  static create(state: CursorState): CursorTextOps {
    return new CursorTextOps(state);
  }

  private constructor(private state: CursorState) {}

  deleteEmptyTree(el: Element) {
    let p = el;
    for (; p; p = p.parentNode as HTMLElement) {
      if (p === this.state.document.root) {
        break;
      }
      if (isEmpty(p)) {
        p.remove();
        continue;
      }
      break;
    }
  }

  /** Delete the current TOKEN. */
  delete(opts?: CursorChangeOpts): void {
    if (!this.state.isOnToken()) return;
    const current = this.state.getPlace();
    const prevCrs = this.state.motion.getPrevious();
    const nextCrs = this.state.motion.getNext();
    const parentNode = current.parentNode as HTMLElement;
    const [prevSibling, nextSibling] = token.remove(current);
    // Favour moving back to previous token
    const nextToken =
      (isToken(prevSibling) && prevSibling) || (isToken(nextSibling) && nextSibling);
    if (nextToken) {
      this.state.place(nextToken, opts);
      return;
    }

    // prev is NOT a token....

    if (!prevCrs && !nextCrs) {
      // There's no prevCrs or nextCrs position We'll place the CURSOR on an
      // anchor so it has somewhere to go.
      const anchor = token.createAnchor();
      if (prevSibling) {
        token.insertAfter(anchor, prevSibling);
      } else if (nextSibling) {
        token.insertBefore(anchor, nextSibling);
      } else {
        parentNode?.appendChild(anchor);
      }
      this.state.place(anchor, opts);
      return;
    }

    if (!prevSibling && !nextSibling) {
      let p: HTMLElement | null = parentNode.parentNode as HTMLElement;
      parentNode.remove();
      this.deleteEmptyTree(p);
    }

    this.state.place((prevCrs || nextCrs) as HTMLElement, opts);
  }

  /** Replace the value of the current TOKEN with a new value. */
  replace(val: string): void {
    if (!this.state.isOnToken()) return;
    token.replaceText(this.state.getPlace(), val);
  }

  /**
   * Similar to insertTextAfter.
   */
  replaceWithText(text: string, opts?: CursorChangeOpts): HTMLElement | null {
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
  insertTextAfter(text: string, opts?: CursorChangeOpts): HTMLElement | null {
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

  insertTextBefore(text: string, opts?: CursorChangeOpts): HTMLElement | null {
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
