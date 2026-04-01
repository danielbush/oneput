import { err, ok, Result } from 'neverthrow';
import * as token from './lib/token.js';
import { isIsland, isLine, isToken } from './lib/taxonomy.js';
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
  edit(initial?: HTMLElement): Result<void, EditManagerError> {
    this.nav = this.nav ?? Nav.create(this.document, this.handleFocusRequest);
    this.nav.connect();
    initial = initial ?? this.nav.getFocus() ?? undefined;
    if (!initial) {
      return err({ type: 'no-token-under-focus' });
    }

    const firstToken = isToken(initial) ? initial : token.quickDescend(initial);
    if (firstToken) {
      const line = getLine(firstToken);
      this.nav.FOCUS(line, { scrollIntoView: false }); // Let the cursor handle scrolling.
      this.userInput.focus();
      if (!this.cursor) {
        this.cursor = TokenCursor.create({
          document: this.document,
          token: firstToken,
          onTokenChange: this.handleTokenChange,
          onError: this.handleCursorError
        });
        this.inputManager = InputManager.create(this.nav, this.cursor, this.userInput);
      } else {
        this.cursor.setToken(firstToken); // calls handleTokenChange
      }
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
    this.userInput.resetPlaceholder();
    this.userInput.enable(true);

    if (isToken(tok)) {
      this.userInput.focus();
      this.userInput.setInputValue(token.getValue(tok)).then(() => {
        this.userInput.selectAll();
      });
    } else {
      this.userInput.enable(false);
      this.userInput.setInputValue('');
      if (isIsland(tok) || isLine(tok)) {
        // TODO: Handle 'Enter' which may be a different key binding.
        this.userInput.setPlaceholder('Hit Enter to edit this element');
      } else {
        this.userInput.setInputValue('(not a token)');
      }
    }
  };

  /**
   * When the user causes a FOCUS change (click, touch, key bindings)...
   */
  private handleFocusRequest = (evt: JsedFocusRequestEvent) => {
    if (!this.cursor || !this.nav) {
      return false;
    }

    // FOCUS has been set to some FOCUSABLE...
    if (evt.targetType === 'FOCUSABLE') {
      this.onExit?.({ focusElement: evt.element });
      return false;
    }

    // FOCUS has been set to a TOKEN...
    if (evt.targetType === 'TOKEN') {
      // Exit and focus on new parent if TOKEN is in a different LINE.
      const parent = token.getParent(evt.token);
      const tokenBelongsToCursorLine = getLine(this.cursor.getToken()).contains(parent);
      if (!tokenBelongsToCursorLine) {
        this.onExit?.({ focusElement: parent });
        return false;
      }

      this.cursor.setToken(evt.token); // calls handleTokenChange
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
}
