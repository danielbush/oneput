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
    return new CursorTextOps(params);
  }

  private constructor(
    private params: {
      cursor: Cursor;
      tokenizer: Tokenizer;
      onError: (err: CursorError) => void;
    }
  ) {}

  /** Replace the value of the current TOKEN with a new value. */
  replace(val: string): void {
    if (!this.isOnToken()) return;
    token.replaceText(this.params.cursor.getToken(), val);
  }

  /** Delete the current TOKEN. */
  delete(): void {
    if (!this.isOnToken()) return;
    const { next: nextTok } = token.remove(this.params.cursor.getToken());
    this.params.cursor.setToken(nextTok);
  }

  /** Append a new TOKEN after the current one. */
  append(val: string): HTMLElement | null {
    if (!this.isOnToken()) return null;
    const current = this.params.cursor.getToken();
    const tok = token.createToken(val);
    token.insertAfter(tok, current);
    space.ensureSeparatorAfter(current);
    return tok;
  }

  /** Merge with next adjacent TOKEN if it exists (JOIN). */
  joinNext(): void {
    if (!this.isOnToken()) return;
    token.joinNext(this.params.cursor.getToken());
  }

  /** Merge with previous adjacent TOKEN if it exists (JOIN). */
  joinPrevious(): void {
    if (!this.isOnToken()) return;
    token.joinPrevious(this.params.cursor.getToken());
  }

  /** Perform SPLIT_BY_TOKEN before the current TOKEN. */
  splitBefore(): HTMLElement | null {
    if (!this.isOnToken()) return null;
    const [before] = token.splitBefore(this.params.cursor.getToken());
    // We may end up in a new token, so we need to update the focus.
    this.params.cursor.setToken(this.params.cursor.getToken());
    return before;
  }

  /** Perform SPLIT_BY_TOKEN after the current TOKEN. */
  splitAfter(): HTMLElement | null {
    if (!this.isOnToken()) return null;
    const [, after] = token.splitAfter(this.params.cursor.getToken());
    const firstTok = this.params.tokenizer.tokenizeLineAt(after);
    if (firstTok) {
      this.params.cursor.setToken(firstTok);
    }
    return after;
  }

  /** Perform SPLIT_BY_TOKEN according to CURSOR_STATE. */
  splitAtToken(): HTMLElement | null {
    if (this.params.cursor.isInsertingAfter() || this.params.cursor.isAppend()) {
      return this.splitAfter();
    }

    return this.splitBefore();
  }

  insertElementAfter(el: HTMLElement): void {
    if (isToken(el)) {
      this.params.onError({ type: 'expected-non-token' });
      throw new Error(`Expected non-token element.`);
    }
    token.insertAfter(el, this.params.cursor.getToken());

    const first = this.params.tokenizer.tokenizeLineAt(el);
    if (first) {
      this.params.cursor.setToken(first);
    }
  }

  insertElementBefore(el: HTMLElement): void {
    if (isToken(el)) {
      this.params.onError({ type: 'expected-non-token' });
      throw new Error(`Expected non-token element.`);
    }
    token.insertBefore(el, this.params.cursor.getToken());

    const first = this.params.tokenizer.tokenizeLineAt(el);
    if (first) {
      this.params.cursor.setToken(first);
    }
  }

  /** Guard: is the CURSOR currently on a TOKEN (not an ISLAND or other non-TOKEN LINE_SIBLING)? */
  private isOnToken(): boolean {
    return isToken(this.params.cursor.getToken());
  }
}
