import * as token from './lib/token.js';
import * as space from './lib/space.js';
import { isToken } from './lib/taxonomy.js';
import type { Cursor, CursorError } from './Cursor.js';
import type { Tokenizer } from './Tokenizer.js';

export class CursorTextOps {
  static create(params: {
    cursor: Cursor;
    tokenizer: Tokenizer;
    onError: (err: CursorError) => void;
  }): CursorTextOps {
    return new CursorTextOps(params.cursor, params.tokenizer, params.onError);
  }

  private constructor(
    private cursor: Cursor,
    private tokenizer: Tokenizer,
    private onError: (err: CursorError) => void
  ) {}

  /** Replace the value of the current TOKEN with a new value. */
  replace(val: string): void {
    if (!this.isOnToken()) return;
    token.replaceText(this.cursor.getPlace(), val);
  }

  /** Delete the current TOKEN. */
  delete(): void {
    if (!this.isOnToken()) return;
    const { next: nextTok } = token.remove(this.cursor.getPlace());
    this.cursor.place(nextTok);
  }

  /** Append a new TOKEN after the current one. */
  append(val: string): HTMLElement | null {
    if (!this.isOnToken()) return null;
    const current = this.cursor.getPlace();
    const tok = token.createToken(val);
    token.insertAfter(tok, current);
    space.ensureSeparatorAfter(current);
    return tok;
  }

  /** Merge with next adjacent TOKEN if it exists (JOIN). */
  joinNext(): void {
    if (!this.isOnToken()) return;
    token.joinNext(this.cursor.getPlace());
  }

  /** Merge with previous adjacent TOKEN if it exists (JOIN). */
  joinPrevious(): void {
    if (!this.isOnToken()) return;
    token.joinPrevious(this.cursor.getPlace());
  }

  /** Perform SPLIT_BY_TOKEN before the current TOKEN. */
  splitBefore(): HTMLElement | null {
    if (!this.isOnToken()) return null;
    const [before] = token.splitBefore(this.cursor.getPlace());
    // We may end up in a new token, so we need to update the focus.
    this.cursor.place(this.cursor.getPlace());
    return before;
  }

  /** Perform SPLIT_BY_TOKEN after the current TOKEN. */
  splitAfter(): HTMLElement | null {
    if (!this.isOnToken()) return null;
    const [, after] = token.splitAfter(this.cursor.getPlace());
    const firstTok = this.tokenizer.tokenizeLineAt(after);
    if (firstTok) {
      this.cursor.place(firstTok);
    }
    return after;
  }

  /** Perform SPLIT_BY_TOKEN according to CURSOR_STATE. */
  splitAtToken(): HTMLElement | null {
    if (this.cursor.isInsertingBefore() || this.cursor.isPrepend()) {
      return this.splitBefore();
    }

    return this.splitAfter();
  }

  insertElementAfter(el: HTMLElement): void {
    if (isToken(el)) {
      this.onError({ type: 'expected-non-token' });
      throw new Error(`Expected non-token element.`);
    }
    token.insertAfter(el, this.cursor.getPlace());

    const first = this.tokenizer.tokenizeLineAt(el);
    if (first) {
      this.cursor.place(first);
    }
  }

  insertElementBefore(el: HTMLElement): void {
    if (isToken(el)) {
      this.onError({ type: 'expected-non-token' });
      throw new Error(`Expected non-token element.`);
    }
    token.insertBefore(el, this.cursor.getPlace());

    const first = this.tokenizer.tokenizeLineAt(el);
    if (first) {
      this.cursor.place(first);
    }
  }

  /** Guard: is the CURSOR currently on a TOKEN (not an ISLAND or other non-TOKEN LINE_SIBLING)? */
  private isOnToken(): boolean {
    return isToken(this.cursor.getPlace());
  }
}
