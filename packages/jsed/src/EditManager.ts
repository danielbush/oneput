import { err, ok, Result } from 'neverthrow';
import * as token from './lib/token.js';
import { isToken } from './lib/taxonomy.js';
import { getLine } from './lib/traversal.js';
import { Nav } from './Nav.js';
import { TokenCursor, type TokenCursorError } from './TokenCursor.js';
import type { ITokenCursor, JsedFocusRequestEvent } from './types.js';
import type { UserInput, UserInputSelectionState } from './UserInput.js';
import { InputManager } from './InputManager.js';
import { TokenManager } from './TokenManager.js';

export type EditManagerError =
  | { type: 'no-token-under-focus' }
  | {
      /**
       * TODO: should we ever let this happen?
       */
      type: 'no-focus';
    }
  | TokenCursorError;

/**
 * Oneput AppObject that manages an edit session for a single document.
 */
export class EditManager {
  static create({
    nav,
    userInput,
    onError,
    onExit
  }: {
    nav: Nav;
    userInput: UserInput;
    onError: (err: EditManagerError) => void;
    onExit?: () => void;
  }): EditManager {
    const tokenManager = TokenManager.create();
    return new EditManager(nav, tokenManager, userInput, onError, onExit);
  }

  private cursor?: ITokenCursor;
  private inputManager?: InputManager;

  constructor(
    private nav: Nav,
    private tokenManager: TokenManager,
    private userInput: UserInput,
    private onError: (err: EditManagerError) => void,
    private onExit?: () => void
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
    this.nav.FOCUS(tok);
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
    if (!this.cursor) {
      return false;
    }

    const cursorLine = this.cursor.getLine();
    const targetElement = evt.targetType === 'TOKEN' ? evt.token : evt.element;
    const targetLine = getLine(targetElement);

    // Exit back to view mode.
    if (targetLine !== cursorLine) {
      this.nav.FOCUS(targetElement);
      this.onExit?.();
      return false;
    }

    // Tokenize on the fly but focus the parent...
    if (evt.targetType === 'FOCUSABLE') {
      this.tokenManager.tokenize(evt.element);
      return true;
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

  /**
   * Set up cursor on first available token under focus.
   */
  getFirstTokenUnderFocus(): Result<ITokenCursor, EditManagerError> {
    const focus = this.nav.getFocus();
    if (focus) {
      const firstToken = this.tokenManager.tokenize(focus);
      if (firstToken) {
        this.userInput.focus();
        return ok(this.#setCursor(firstToken, getLine(focus)));
      }
      return err({ type: 'no-token-under-focus' });
    }
    return err({ type: 'no-focus' });
  }

  #setCursor(tok: HTMLElement, line: HTMLElement) {
    if (!this.cursor) {
      this.cursor = TokenCursor.create({
        document: this.nav.document,
        tokenManager: this.tokenManager,
        token: tok,
        line,
        onTokenChange: this.handleTokenChange,
        onError: this.handleCursorError
      });
      this.inputManager = InputManager.create(this.nav, this.cursor, this.userInput);
    } else {
      this.cursor.setToken(tok);
    }
    return this.cursor;
  }
}
