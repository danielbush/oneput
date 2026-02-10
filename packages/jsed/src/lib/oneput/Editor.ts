import type { Controller } from '$oneput';
import type { JsedCursor } from '$lib/jsed/index.js';
import type { JsedDocument } from '$lib/jsed/types.js';
import * as jsed from '$lib/jsed/index.js';

/**
 * Represents an html input or textarea that can be manipulated by an editor.
 */
export type InputWrapper = {
  setInputValue: (value: string) => Promise<void>;
  getRange: () => [number | null, number | null];
  moveCursorToBeginning: () => void;
  moveCursorToEnd: () => void;
  focus: () => void;
  selectAll: () => void;
};

/**
 * Performs edit/navigation operations by coordinating between JsedDocument,
 * JsedCursor and an html input/textarea.
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
 */
export class Editor {
  static create({
    document,
    controller: ctl,
    initialToken
  }: {
    document: JsedDocument;
    controller: Controller;
    initialToken: HTMLElement;
  }) {
    const instance = new Editor(document, ctl.input, initialToken);
    ctl.events.on('input-change', ({ value }) => {
      instance.userInput(value);
    });
    return instance;
  }

  public cursor: JsedCursor;

  constructor(
    private document: JsedDocument,
    private input: InputWrapper,
    initialToken: HTMLElement
  ) {
    this.cursor = document.requestCursor({
      token: initialToken
    });
    input.focus();
    input.setInputValue(jsed.utils.token.getValue(this.cursor.getToken())).then(() => {
      input.selectAll();
    });
  }

  closeCursor() {
    // clearInput();
    // blurInput();
  }

  /**
   * Handles USER_CALL / USER_ACT operations.
   *
   * @param token {HTMLElement} What the user has clicked/touched.
   */
  // setCursor(token: HTMLElement) {
  //   //
  // }

  /**
   * Handles USER_TYPE operations.
   *
   * @param {string} inputValue What the user has typed into an html input/textarea
   */
  async userInput(inputValue: string) {
    // "foo" => " " => "foo "
    const isReplacedWithSpace = /^\s+$/.test(inputValue); // " "
    const value = isReplacedWithSpace
      ? jsed.utils.token.getValue(this.cursor.getToken()) + ' ' // "foo" + " "
      : inputValue;
    // Apply rewrite:
    this.input.setInputValue(value);

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
      const [, stop] = this.input.getRange();
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
      this.input.moveCursorToBeginning();
    }

    const finalToken = preferFirstPart ? this.cursor.getToken() : lastToken;

    if (finalToken) {
      this.cursor.setToken(finalToken);
      //// this.#cursorMarkers.clear();
      // this.#controller.onMobileKeyboardOpenOnce(() => {
      //   debug('correct mobile keyboard scroll');
      //   scrollIntoView(token);
      // });
      this.input.focus();
      await this.input.setInputValue(jsed.utils.token.getValue(finalToken));
      this.input.selectAll();
      //// scrollIntoView(token);
      // this.#controller.setStatusElementFocus(token);
      this.document.nav.FOCUS(finalToken);
      this.input.moveCursorToEnd();
    }
  }
}
