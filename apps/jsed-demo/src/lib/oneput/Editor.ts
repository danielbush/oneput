import type { Controller } from '$oneput';
import type { IJsedCursor } from '$lib/jsed/index.js';
import type { JsedDocument } from '$lib/jsed/types.js';
import * as jsed from '$lib/jsed/index.js';
import { CursorMarkers } from './CursorMarkers.js';

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
  static create(
    ctl: Controller,
    {
      document,
      initialToken
    }: {
      document: JsedDocument;
      initialToken: HTMLElement;
    }
  ) {
    const instance = new Editor(ctl, document, initialToken);
    return instance;
  }

  public cursor: IJsedCursor;
  public cursorMarkers: CursorMarkers;

  constructor(
    private ctl: Controller,
    private document: JsedDocument,
    initialToken: HTMLElement
  ) {
    this.cursor = document.requestCursor({
      token: initialToken,
      onTokenChange: this.handleTokenChange
    });
    ctl.events.on('input-change', ({ value }) => {
      this.userInput(value);
    });
    this.cursorMarkers = CursorMarkers.create(ctl, this.cursor);
    this.ctl.input.focus();
    ctl.input.setInputValue(jsed.utils.token.getValue(this.cursor.getToken())).then(() => {
      ctl.input.selectAll();
    });
    this.document.listeners.REQUEST_FOCUS = this.handleFocusRequest;
  }

  private handleFocusRequest = (evt: jsed.JsedFocusRequestEvent) => {
    if (evt.targetType === 'TOKEN') {
      if (this.cursor.isSameLine(evt.token)) {
        this.cursor.setToken(evt.token);
        this.ctl.input.focus();
        // TODO: await instead of .then?
        this.ctl.input.setInputValue(jsed.utils.token.getValue(evt.token)).then(() => {
          this.ctl.input.selectAll();
        });
        return false; // TODO: old code: #handleCursorSetToken will call FOCUS.
      }
    }
    this.exit();
    return true;
  };

  private exit() {
    console.warn('Editor wants to exit!');
    // TODO exit editor as per #handleExist from jsed-ui src/session/edit/index.ts
  }

  closeCursor() {
    // clearInput();
    // blurInput();
  }

  /**
   * When the cursor changes its token because of some action it has been
   * commanded to do (eg due to delete operation).
   *
   * USER_CALL / USER_ACT
   */
  private handleTokenChange = async (token: HTMLElement) => {
    this.ctl.input.setInputValue(jsed.utils.token.getValue(token)).then(() => {
      this.ctl.input.selectAll();
    });
  };

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
    this.ctl.input.setInputValue(value);

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
      const [, stop] = this.ctl.input.getRange();
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
      this.ctl.input.moveCursorToBeginning();
    }

    const finalToken = preferFirstPart ? this.cursor.getToken() : lastToken;

    if (finalToken) {
      this.cursor.setToken(finalToken);
      //// this.#cursorMarkers.clear();
      // this.#controller.onMobileKeyboardOpenOnce(() => {
      //   debug('correct mobile keyboard scroll');
      //   scrollIntoView(token);
      // });
      this.ctl.input.focus();
      await this.ctl.input.setInputValue(jsed.utils.token.getValue(finalToken));
      this.ctl.input.selectAll();
      //// scrollIntoView(token);
      // this.#controller.setStatusElementFocus(token);
      this.document.nav.FOCUS(finalToken);
      this.ctl.input.moveCursorToEnd();
    }
  }
}
