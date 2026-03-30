import { err, ok, Result } from 'neverthrow';
import * as token from './lib/token.js';
import { isToken } from './lib/taxonomy.js';
import { getLine } from './lib/sibwalk.js';
import { Nav } from './Nav.js';
import { TokenCursor, type TokenCursorError } from './TokenCursor.js';
import type { ITokenCursor, JsedDocument, JsedFocusRequestEvent } from './types.js';
import type { UserInput, UserInputSelectionState } from './UserInput.js';
import { InputManager } from './InputManager.js';

export type EditManagerError = { type: 'no-token-under-focus' } | TokenCursorError;

/**
 * Manages an edit session for a single document.
 *
 * Call `edit(initialFocus)` to create a Nav, connect it, tokenize the
 * focused element, and enter edit mode. Call `destroy()` to tear down.
 */
export class EditManager {
  static create({
    document,
    userInput,
    onError,
    onExit
  }: {
    document: JsedDocument;
    userInput: UserInput;
    onError: (err: EditManagerError) => void;
    onExit?: (result: { focusElement: HTMLElement }) => void;
  }): EditManager {
    return new EditManager(document, userInput, onError, onExit);
  }

  nav?: Nav;
  cursor?: ITokenCursor;
  private inputManager?: InputManager;

  constructor(
    private document: JsedDocument,
    private userInput: UserInput,
    private onError: (err: EditManagerError) => void,
    private onExit?: (result: { focusElement: HTMLElement }) => void
  ) {}

  /**
   * Create a Nav, connect it, set FOCUS to `initialFocus`, tokenize via
   * quickDescend, and enter edit mode with the CURSOR on the first TOKEN.
   */
  edit(initial: HTMLElement): Result<void, EditManagerError> {
    this.nav = Nav.create(this.document, this.handleFocusRequest);
    this.nav.connect();

    const firstToken = isToken(initial) ? initial : token.quickDescend(initial);
    if (firstToken) {
      const line = getLine(firstToken);
      this.nav.FOCUS(line, { scrollIntoView: false }); // Let the cursor handle scrolling.
      this.userInput.focus();
      this.#setCursor(firstToken, line);
      return ok(undefined);
    }

    return err({ type: 'no-token-under-focus' });
  }

  destroy() {
    this.cursor?.destroy();
    this.nav?.destroy();
  }

  /**
   * When user types in the input...
   *
   * @param {string} input What the user has typed into an html input/textarea
   */
  public handleInputChange = (input: string) => {
    if (!this.cursor || !isToken(this.cursor.getToken())) return;
    this.inputManager?.handleInputChange(input);
    this.cursor?.handleInputChange(input);
  };

  /**
   * When user changes the selection in the input...
   *
   * Pass this to the selection emitter after instantiation.
   */
  public handleSelectionChange = (selection: UserInputSelectionState) => {
    if (!this.cursor || !isToken(this.cursor.getToken())) return;
    this.cursor?.handleSelectionChange(selection);
  };

  /**
   * When the cursor changes its token because of some action it has been
   * commanded to do usually by the user... (eg due to delete operation).
   */
  private handleTokenChange = async (tok: HTMLElement) => {
    this.nav?.FOCUS(tok, { scrollIntoView: false }); // Let the cursor handle scrolling.
    if (isToken(tok)) {
      this.userInput.enable(true);
      this.userInput.focus();
      this.userInput.setInputValue(token.getValue(tok)).then(() => {
        this.userInput.selectAll();
      });
    } else {
      this.userInput.enable(false);
      this.userInput.setInputValue('(not a token)');
    }
  };

  /**
   * When the user clicks/touches somewhere, decide if we allow the FOCUS to
   * occur...
   */
  private handleFocusRequest = (evt: JsedFocusRequestEvent) => {
    if (!this.cursor || !this.nav) {
      return false;
    }

    const cursorLine = this.cursor.getLine();
    const targetElement = evt.targetType === 'TOKEN' ? evt.token : evt.element;
    const targetLine = getLine(targetElement);

    // A change in LINE suggests the user is navigating to a different "part" of
    // the document...
    if (targetLine !== cursorLine) {
      this.onExit?.({ focusElement: targetElement });
      return false;
    }

    if (evt.targetType === 'TOKEN') {
      // For consistency, clicking on a parent that is the current LINE_SEGMENT
      // focuses the parent instead of the token.
      const parent = token.getParent(evt.token);
      const preferParentFocus = parent !== this.nav.getFocus();
      if (preferParentFocus) {
        this.nav.FOCUS(parent);
        return false;
      }

      this.cursor.setToken(evt.token);
      this.userInput.focus();
      this.userInput.setInputValue(token.getValue(evt.token)).then(() => {
        this.userInput.selectAll();
      });
      return true;
    }

    return false;
  };

  /**
   * If the cursor finds itself in an untenable state...
   */
  private handleCursorError = (err: TokenCursorError) => {
    this.onError(err);
  };

  #setCursor(tok: HTMLElement, line: HTMLElement) {
    if (!this.cursor) {
      this.cursor = TokenCursor.create({
        document: this.document,
        token: tok,
        line,
        onTokenChange: this.handleTokenChange,
        onError: this.handleCursorError
      });
      this.inputManager = InputManager.create(this.nav!, this.cursor, this.userInput);
    } else {
      this.cursor.setToken(tok);
    }
    return this.cursor;
  }
}
