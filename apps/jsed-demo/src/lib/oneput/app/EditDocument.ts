import type { AppObject, Controller } from '@oneput/oneput';
import {
  type JsedDocument,
  type IJsedCursor,
  utils,
  CursorMarkers,
  type JsedFocusRequestEvent
} from '@oneput/jsed';

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
export class EditDocument implements AppObject {
  static create(ctl: Controller, params: { document: JsedDocument }) {
    return new EditDocument(ctl, params.document);
  }

  private cursor?: IJsedCursor;
  private cursorMarkers?: CursorMarkers;

  constructor(
    private ctl: Controller,
    private document: JsedDocument
  ) {}

  public onStart = () => {
    this.document
      .requestCursorUnderFocus({
        onTokenChange: this.handleTokenChange
      })
      .map((cursor) => {
        this.cursor = cursor;
        this.ctl.events.on('input-change', ({ value }) => {
          this.handleUserInput(value);
        });
        this.cursorMarkers = CursorMarkers.create(this.ctl, this.cursor);
        // So the user can start editing...
        this.ctl.input.focus();
        this.document.listeners.REQUEST_FOCUS = this.handleFocusRequest;
        this.document.nav.FOCUS(this.cursor.getToken());
      })
      .mapErr((err) => {
        switch (err.type) {
          case 'no-token-under-focus':
            this.ctl.notify('No token under focus', { duration: 3000 });
            this.ctl.app.exit();
            break;
          case 'no-focus':
            this.ctl.notify('No document focus found', { duration: 3000 });
            this.ctl.app.exit();
            break;
        }
      });
  };

  public onExit = () => {};

  /**
   * When the cursor changes its token because of some action it has been
   * commanded to do (eg due to delete operation).
   *
   * USER_CALL / USER_ACT
   */
  private handleTokenChange = async (token: HTMLElement) => {
    this.ctl.input.setInputValue(utils.token.getValue(token)).then(() => {
      this.ctl.input.selectAll();
    });
  };

  private handleFocusRequest = (evt: JsedFocusRequestEvent) => {
    if (!this.cursor) {
      return false;
    }
    if (evt.targetType === 'TOKEN') {
      if (this.cursor.isSameLine(evt.token)) {
        this.cursor.setToken(evt.token);
        this.ctl.input.focus();
        // TODO: await instead of .then?
        this.ctl.input.setInputValue(utils.token.getValue(evt.token)).then(() => {
          this.ctl.input.selectAll();
        });
        return false; // TODO: old code: #handleCursorSetToken will call FOCUS.
      }
    }
    return true;
  };

  /**
   * Handles USER_TYPE operations.
   *
   * @param {string} inputValue What the user has typed into an html input/textarea
   */
  private async handleUserInput(inputValue: string) {
    if (!this.cursor) {
      return;
    }

    // "foo" => " " => "foo "
    const isReplacedWithSpace = /^\s+$/.test(inputValue); // " "
    const value = isReplacedWithSpace
      ? utils.token.getValue(this.cursor.getToken()) + ' ' // "foo" + " "
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
      await this.ctl.input.setInputValue(utils.token.getValue(finalToken));
      this.ctl.input.selectAll();
      //// scrollIntoView(token);
      // this.#controller.setStatusElementFocus(token);
      this.document.nav.FOCUS(finalToken);
      this.ctl.input.moveCursorToEnd();
    }
  }
}
