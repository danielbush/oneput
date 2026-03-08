import { err, ok, Result } from 'neverthrow';
import * as token from './lib/token.js';
import { Nav } from './Nav.js';
import { TokenCursor } from './TokenCursor.js';
import type { ITokenCursor, JsedFocusRequestEvent } from './types.js';
import type { UserInput, UserInputSelectionState } from './UserInput.js';

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
  static create({ nav, userInput }: { nav: Nav; userInput: UserInput }): EditManager {
    return new EditManager(nav, userInput);
  }

  private cursor?: ITokenCursor;

  constructor(
    private nav: Nav,
    private userInput: UserInput
  ) {
    this.nav.setFocusController(this.handleFocusRequest);
  }

  close() {
    this.cursor?.close();
    this.nav.removeFocusController();
  }

  /**UserInputSelectionState
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
  public handleSelectionChange = (selection: UserInputSelectionState) => {
    this.cursor?.handleSelectionChange(selection);
  };

  /**
   * When the cursor changes its token because of some action it has been
   * commanded to do usually by the user... (eg due to delete operation).
   *
   * USER_CALL / USER_ACT
   */
  private handleTokenChange = async (tok: HTMLElement) => {
    this.nav.FOCUS(tok);
    this.userInput.setInputValue(token.getValue(tok)).then(() => {
      this.userInput.selectAll();
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
        this.userInput.focus();
        // TODO: await instead of .then?
        this.userInput.setInputValue(token.getValue(evt.token)).then(() => {
          this.userInput.selectAll();
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
    this.userInput.setInputValue(value);

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
      const [, stop] = this.userInput.getRange();
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
      this.userInput.moveCursorToBeginning();
    }

    const finalToken = preferFirstPart ? this.cursor.getToken() : lastToken;

    if (finalToken) {
      this.cursor.setToken(finalToken);
      //// this.#cursorMarkers.clear();
      // this.#controller.onMobileKeyboardOpenOnce(() => {
      //   debug('correct mobile keyboard scroll');
      //   scrollIntoView(token);
      // });
      this.userInput.focus();
      await this.userInput.setInputValue(token.getValue(finalToken));
      this.userInput.selectAll();
      //// scrollIntoView(token);
      // this.#controller.setStatusElementFocus(token);
      this.nav.FOCUS(finalToken);
      this.userInput.moveCursorToEnd();
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
        this.userInput.focus();
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
