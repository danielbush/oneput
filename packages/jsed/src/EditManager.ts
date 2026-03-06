import { err, ok, Result } from 'neverthrow';
import { Navigator } from './Navigator.js';
import * as token from './lib/token.js';
import type { ITokenCursor, JsedFocusRequestEvent } from './types.js';
import { TokenCursor } from './index.js';

export type InputManager = {
  setInputValue: (value: string) => Promise<void>;
  selectAll: () => void;
  moveCursorToBeginning: () => void;
  moveCursorToEnd: () => void;
  getRange: () => [number | null, number | null];
  focus: () => void;
};

export type JsedInputSelectionState =
  | 'SELECT_ALL'
  | 'SELECT_PARTIAL'
  | 'CURSOR_AT_BEGINNING'
  | 'CURSOR_AT_MIDDLE'
  | 'CURSOR_AT_END'
  | 'EMPTY';

export type EditManagerError =
  | { type: 'no-token-under-focus' }
  | {
      /**
       * TODO: should we ever let this happen?
       */
      type: 'no-focus';
    };

/**
 * Oneput AppObject that manages an edit session for a single document.
 *
 * There are 3 main ways we get operations...
 *
 * - USER_CALL user triggers action eg EDIT_FIRST via a menu
 *   - cursor updates to reflect the location
 *   - input updates to reflect cursor
 * - USER_ACT user clicks/touches token
 *   - document emits REQUEST_FOCUS
 *   - cursor updates to reflect touch
 *   - input updates to reflect cursor
 * - USER_TYPE user types in input
 *   - the input event is emitted with the changed text
 *   - input may be updated as a result (eg typing "abc d" -> "d|"
 *   - cursor updates to reflect the final input state
 * - cursor is updated programmatically
 *   - this might be a remote cursor
 *   - input is not updated
 *
 */
export class EditManager {
  static create({
    nav,
    inputManager
  }: {
    nav: Navigator;
    inputManager: InputManager;
  }): EditManager {
    return new EditManager(nav, inputManager);
  }

  private cursor?: ITokenCursor;

  constructor(
    private nav: Navigator,
    private inputManager: InputManager
  ) {
    this.nav.setFocusController(this.handleFocusRequest);
  }

  close() {
    this.cursor?.close();
    this.nav.removeFocusController();
  }

  /**
   * When user types in the input...
   *
   * Pass this to the input emitter after instantiation.
   */
  public handleInputChange = (input: string) => {
    this.computeFromInput(input);
    this.cursor?.handleInputChange(input);
  };

  /**
   * When user changes the selection in the input...
   *
   * Pass this to the selection emitter after instantiation.
   */
  public handleSelectionChange = (selection: JsedInputSelectionState) => {
    this.cursor?.handleSelectionChange(selection);
  };

  /**
   * When the cursor changes its token because of some action it has been
   * commanded to do usually by the user... (eg due to delete operation).
   *
   * USER_CALL / USER_ACT
   */
  private handleTokenChange = async (tok: HTMLElement) => {
    this.inputManager.setInputValue(token.getValue(tok)).then(() => {
      this.inputManager.selectAll();
    });
  };

  /**
   * When the user clicks/touches somewhere, decide if we allow the FOCUS to
   * occur...
   */
  private handleFocusRequest = (evt: JsedFocusRequestEvent) => {
    if (!this.cursor) {
      return false;
    }
    if (evt.targetType === 'TOKEN') {
      if (this.cursor.isSameLine(evt.token)) {
        this.cursor.setToken(evt.token);
        this.inputManager.focus();
        // TODO: await instead of .then?
        this.inputManager.setInputValue(token.getValue(evt.token)).then(() => {
          this.inputManager.selectAll();
        });
        return true; // TODO: old code: #handleCursorSetToken will call FOCUS.
      }
    }
    return false;
  };

  /**
   * Handles USER_TYPE operations.
   *
   * @param {string} inputValue What the user has typed into an html input/textarea
   */
  private async computeFromInput(inputValue: string) {
    if (!this.cursor) {
      return;
    }

    // "foo" => " " => "foo "
    const isReplacedWithSpace = /^\s+$/.test(inputValue); // " "
    const value = isReplacedWithSpace
      ? token.getValue(this.cursor.getToken()) + ' ' // "foo" + " "
      : inputValue;
    // Apply rewrite:
    this.inputManager.setInputValue(value);

    // part0 can be undefined if we split on whitespace:
    const [part0, ...parts] = value.split(/\s+/).filter(Boolean);
    /**
     * "|foo" => " |foo" => "| foo"
     */
    const prependedSpace = /^\s+/.test(value);
    /**
     * true: "foo|a" => "foo |a" => "foo|"
     * false: "foo a|" => "a|" etc
     * false: "foo a" (pasted) => "a|"
     */
    let preferFirstPart = false;
    const containsSpace = value.match(/^(\S+)(\s+)\S/); // "foo a..."
    if (containsSpace) {
      const firstWord = containsSpace[1];
      const firstSpace = containsSpace[2];
      const [, stop] = this.inputManager.getRange();
      preferFirstPart = firstWord.length === stop || stop == firstWord.length + firstSpace.length;
    }
    let lastToken: HTMLElement | null = null;

    // Update document.
    if (value === '') {
      this.cursor.delete();
    } else {
      this.cursor.replace(part0);
      for (const part of parts.reverse()) {
        const token = this.cursor.append(part);
        if (!lastToken) {
          lastToken = token;
        }
      }
    }

    // Update TOKEN_FOCUS and input.
    if (prependedSpace) {
      this.inputManager.moveCursorToBeginning();
    }

    const finalToken = preferFirstPart ? this.cursor.getToken() : lastToken;

    if (finalToken) {
      this.cursor.setToken(finalToken);
      //// this.#cursorMarkers.clear();
      // this.#controller.onMobileKeyboardOpenOnce(() => {
      //   debug('correct mobile keyboard scroll');
      //   scrollIntoView(token);
      // });
      this.inputManager.focus();
      await this.inputManager.setInputValue(token.getValue(finalToken));
      this.inputManager.selectAll();
      //// scrollIntoView(token);
      // this.#controller.setStatusElementFocus(token);
      this.nav.FOCUS(finalToken);
      this.inputManager.moveCursorToEnd();
    }
  }

  /**
   * Set up cursor on first available token under focus.
   */
  getFirstTokenUnderFocus(): Result<ITokenCursor, EditManagerError> {
    const focus = this.nav.getFocus();
    if (focus) {
      const firstToken = token.getFirstToken(focus);
      if (firstToken) {
        this.inputManager.focus();
        return ok(this.#setCursor(firstToken));
      }
      return err({ type: 'no-token-under-focus' });
    }
    return err({ type: 'no-focus' });
  }

  #setCursor(token: HTMLElement) {
    if (!this.cursor) {
      this.cursor = TokenCursor.create({
        document: this.nav.document,
        token,
        onTokenChange: this.handleTokenChange
      });
    } else {
      this.cursor.setToken(token);
    }
    return this.cursor;
  }
}
