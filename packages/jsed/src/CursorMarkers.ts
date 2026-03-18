import { type ITokenCursor } from './index.js';
import type { InputSelectionState } from '@oneput/oneput';
import * as constants from './lib/constants.js';

/**
 * Manages the display state of the TOKEN under the cursor.
 *
 * We're interested in the following markers:
 *
 * insert markers:
 *
 * - CURSOR_INSERT_AFTER_CLASS - the cursor is about to insert new token after this token
 * - CURSOR_INSERT_BEFORE_CLASS - the cursor is about to insert new token before this token
 *
 * update markers:
 *
 * - CURSOR_PREPEND_CLASS - the cursor is about to prepend text to the token (no spaces)
 * - CURSOR_APPEND_CLASS - the cursor is about to append text to the token (no spaces)
 */
export class CursorMarkers {
  static create(cursor: ITokenCursor): CursorMarkers {
    return new CursorMarkers(cursor);
  }

  constructor(private cursor: ITokenCursor) {}

  handleInputChange = (inputValue: string): void => {
    const val = inputValue;
    if (val.endsWith(' ')) {
      this.addFocusClasses(constants.CURSOR_INSERT_AFTER_CLASS);
    } else if (val.startsWith(' ')) {
      this.addFocusClasses(constants.CURSOR_INSERT_BEFORE_CLASS);
    }
  };

  handleSelectionChange = (state: InputSelectionState): void => {
    switch (state) {
      case 'CURSOR_AT_BEGINNING':
        this.addFocusClasses(constants.CURSOR_PREPEND_CLASS);
        return;
      case 'CURSOR_AT_END':
        this.addFocusClasses(constants.CURSOR_APPEND_CLASS);
        return;
      default:
        this.addFocusClasses();
    }
  };

  clear(): void {
    this.cursor.removeFocusClasses(
      constants.CURSOR_INSERT_AFTER_CLASS,
      constants.CURSOR_INSERT_BEFORE_CLASS,
      constants.CURSOR_PREPEND_CLASS,
      constants.CURSOR_APPEND_CLASS
    );
  }

  private addFocusClasses(...classNames: string[]): void {
    this.clear();
    this.cursor.addFocusClasses(...classNames);
  }

  isInsertingAfter(): boolean {
    return this.cursor.getToken().classList.contains(constants.CURSOR_INSERT_AFTER_CLASS);
  }

  isInsertingBefore(): boolean {
    return this.cursor.getToken().classList.contains(constants.CURSOR_INSERT_BEFORE_CLASS);
  }

  close(): void {
    this.clear();
    this.#onClose?.();
  }

  #onClose: (() => void) | undefined;

  onClose(callback: () => void): void {
    this.#onClose = callback;
  }
}
