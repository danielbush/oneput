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
export type EditManagerMode = 'view' | 'editing';

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
    onError
  }: {
    document: JsedDocument;
    userInput: UserInput;
    onError: (err: EditManagerError) => void;
  }): EditManager {
    let instance: EditManager;
    const nav = Nav.create(document, (evt) => instance.handleFocusRequest(evt));
    instance = new EditManager(document, userInput, onError, nav);
    return instance;
  }

  static createNull({
    document,
    userInput,
    onError
  }: {
    document: JsedDocument;
    userInput: UserInput;
    onError: (err: EditManagerError) => void;
  }): EditManager {
    let instance: EditManager;
    const nav = Nav.createNull(document, (evt) => instance.handleFocusRequest(evt));
    instance = new EditManager(document, userInput, onError, nav);
    return instance;
  }

  cursor?: ITokenCursor;
  private inputManager?: InputManager;
  private mode: EditManagerMode = 'view';

  constructor(
    private document: JsedDocument,
    private userInput: UserInput,
    private onError: (err: EditManagerError) => void,
    readonly nav: Nav
  ) {}

  getMode(): EditManagerMode {
    return this.mode;
  }

  /**
   * Put CURSOR on first LINE associated with `initial`.
   *
   * If `initial` is a TOKEN, the CURSOR will be placed on that token.
   * If `initial` is a FOCUSABLE, the CURSOR will be placed on the first token in the LINE.
   */
  enterEditing(initial?: HTMLElement): Result<void, EditManagerError> {
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
      this.mode = 'editing';
      return ok(undefined);
    }

    return err({ type: 'no-token-under-focus' });
  }

  exitEditing(params?: { focusElement?: HTMLElement; scrollIntoView?: boolean }) {
    const focusElement = params?.focusElement ?? this.nav.getFocus() ?? undefined;
    this.cursor?.destroy();
    this.cursor = undefined;
    this.userInput.setInputValue('');
    this.inputManager = undefined;
    this.mode = 'view';

    if (focusElement) {
      this.nav.FOCUS(focusElement, { scrollIntoView: params?.scrollIntoView ?? false });
      token.quickDescend(focusElement);
    }
  }

  destroy() {
    this.cursor?.destroy();
    this.nav.destroy();
  }

  /**
   * When user types in the input...
   *
   * @param {string} input What the user has typed into an html input/textarea
   */
  public handleInputChange = (input: string) => {
    if (this.mode !== 'editing' || !this.cursor || !isToken(this.cursor.getToken())) return;
    this.inputManager?.handleInputChange(input);
    this.cursor?.handleInputChange(input);
  };

  /**
   * When user changes the selection in the input...
   *
   * Pass this to the selection emitter after instantiation.
   */
  public handleSelectionChange = (selection: UserInputSelectionState) => {
    if (this.mode !== 'editing' || !this.cursor || !isToken(this.cursor.getToken())) return;
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
    if (this.mode === 'view') {
      return this.handleFocusRequestInViewMode(evt);
    }

    return this.handleFocusRequestInEditingMode(evt);
  };

  private handleFocusRequestInViewMode = (evt: JsedFocusRequestEvent) => {
    const currentFocus = this.nav.getFocus();

    if (evt.targetType === 'FOCUSABLE') {
      if (evt.element === currentFocus) {
        this.enterEditing(evt.element).mapErr(this.onError);
        return false;
      }

      token.quickDescend(evt.element);
      return true;
    }

    if (evt.targetType === 'TOKEN') {
      if (currentFocus?.contains(evt.token)) {
        this.enterEditing(evt.token).mapErr(this.onError);
        return false;
      }

      return true;
    }

    return true;
  };

  private handleFocusRequestInEditingMode = (evt: JsedFocusRequestEvent) => {
    if (!this.cursor) {
      return false;
    }

    // FOCUS has been set to some FOCUSABLE...
    if (evt.targetType === 'FOCUSABLE') {
      this.exitEditing({ focusElement: evt.element });
      return false;
    }

    // FOCUS has been set to a TOKEN...
    if (evt.targetType === 'TOKEN') {
      const parent = token.getParent(evt.token);
      if (!this.cursor.isSameLine(evt.token)) {
        this.exitEditing({ focusElement: parent });
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
