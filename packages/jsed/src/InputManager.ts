import type { ITokenCursor } from './types.js';
import type { UserInput } from './UserInput.js';
import type { Nav } from './Nav.js';
import * as token from './lib/token.js';

export class InputManager {
  static create(nav: Nav, cursor: ITokenCursor, userInput: UserInput) {
    return new InputManager(nav, cursor, userInput);
  }
  constructor(
    private nav: Nav,
    private cursor: ITokenCursor,
    private userInput: UserInput
  ) {}

  handleInputChange = async (inputValue: string) => {
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

    // Update CURSOR and input.
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
  };
}
