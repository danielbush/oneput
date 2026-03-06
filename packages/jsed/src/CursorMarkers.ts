import { type IJsedCursor } from './index.js';
import type { InputSelectionState } from '@oneput/oneput';
import * as constants from './lib/constants.js';

/**
 * Manages the display state of the TOKEN under the cursor.
 *
 * We're interested in the following markers:
 *
 * insert markers:
 *
 * - TOKEN_INSERT_AFTER_CLASS - the cursor is about to insert new token after this token
 * - TOKEN_INSERT_BEFORE_CLASS - the cursor is about to insert new token before this token
 *
 * update markers:
 *
 * - TOKEN_PREPEND_CLASS - the cursor is about to prepend text to the token (no spaces)
 * - TOKEN_APPEND_CLASS - the cursor is about to append text to the token (no spaces)
 */
export class CursorMarkers {
  static create(cursor: IJsedCursor): CursorMarkers {
    return new CursorMarkers(cursor);
  }

  constructor(private cursor: IJsedCursor) {}

  handleInputChange = (inputValue: string): void => {
    const val = inputValue;
    if (val.endsWith(' ')) {
      this.addFocusClasses(constants.TOKEN_INSERT_AFTER_CLASS);
    } else if (val.startsWith(' ')) {
      this.addFocusClasses(constants.TOKEN_INSERT_BEFORE_CLASS);
    }
  };

  clear(): void {
    this.cursor.removeFocusClasses(
      constants.TOKEN_INSERT_AFTER_CLASS,
      constants.TOKEN_INSERT_BEFORE_CLASS,
      constants.TOKEN_PREPEND_CLASS,
      constants.TOKEN_APPEND_CLASS
    );
  }

  private addFocusClasses(...classNames: string[]): void {
    this.clear();
    this.cursor.addFocusClasses(...classNames);
  }

  handleToggleSelect = (state: InputSelectionState): void => {
    switch (state) {
      case 'CURSOR_AT_BEGINNING':
        this.addFocusClasses(constants.TOKEN_PREPEND_CLASS);
        return;
      case 'CURSOR_AT_END':
        this.addFocusClasses(constants.TOKEN_APPEND_CLASS);
        return;
      default:
        this.addFocusClasses();
    }
  };

  isInsertingAfter(): boolean {
    return this.cursor.getToken().classList.contains(constants.TOKEN_INSERT_AFTER_CLASS);
  }

  isInsertingBefore(): boolean {
    return this.cursor.getToken().classList.contains(constants.TOKEN_INSERT_BEFORE_CLASS);
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
