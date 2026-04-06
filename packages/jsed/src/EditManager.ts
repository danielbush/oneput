import { err, ok, Result } from 'neverthrow';
import * as token from './lib/token.js';
import { isIsland, isLine, isToken } from './lib/taxonomy.js';
import { getLine } from './lib/sibwalk.js';
import { Nav } from './Nav.js';
import { TokenCursor, type TokenCursorError } from './TokenCursor.js';
import type { ITokenCursor, JsedDocument, JsedFocusRequestEvent } from './types.js';
import type { UserInput, UserInputChange, UserInputSelectionState } from './UserInput.js';

export type EditManagerError = { type: 'no-token-under-focus' } | TokenCursorError;
export type EditManagerMode = 'view' | 'edit';

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
  private mode: EditManagerMode = 'view';
  private unsubscribeInputChange?: () => void;
  private unsubscribeSelectionChange?: () => void;

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
    this.unsubscribeInputChange?.();
    this.unsubscribeSelectionChange?.();
    this.unsubscribeInputChange = this.userInput.subscribeInputChange(this.handleInputChange);
    this.unsubscribeSelectionChange = this.userInput.subscribeSelectionChange(
      this.handleSelectionChange
    );

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
      } else {
        this.cursor.setToken(firstToken); // calls handleTokenChange
      }
      this.mode = 'edit';
      return ok(undefined);
    }

    return err({ type: 'no-token-under-focus' });
  }

  exitEditing(params?: { focusElement?: HTMLElement; scrollIntoView?: boolean }) {
    const focusElement = params?.focusElement ?? this.nav.getFocus() ?? undefined;
    this.unsubscribeInputChange?.();
    this.unsubscribeSelectionChange?.();
    this.cursor?.destroy();
    this.cursor = undefined;
    this.userInput.setInputValue('');
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
   * @param {string} inputValue What the user has typed into an html input/textarea
   */
  public handleInputChange = async (change: UserInputChange) => {
    if (this.mode !== 'edit' || !this.cursor || !isToken(this.cursor.getToken())) return;
    const { value: inputValue, previousValue, previousRange, range } = change;
    const [, previousStop] = previousRange;
    const [, stop] = range;

    // "[foo]" => " " => moveNext
    const isReplacedWithSpace = /^\s+$/.test(inputValue); // " "
    if (isReplacedWithSpace) {
      this.cursor.moveNext();
      return;
    }
    const value = inputValue;

    // part0 can be undefined if we split on whitespace:
    const [part0, ...parts] = value.split(/\s+/).filter(Boolean);
    /**
     * "|foo" => " |foo" => "| foo"
     */
    const prependedSpace = /^\s+/.test(value);
    /**
     * true: "foo| a" => "foo|"
     * false: "foo a|" => "a|" etc
     * false: "foo a" (pasted) => "a|"
     */
    let preferFirstPart = false;
    const containsSpace = value.match(/^(\S+)(\s+)\S/); // "foo a..."
    if (containsSpace) {
      const firstWord = containsSpace[1];
      const insertedSpace = containsSpace[2];
      const isFirstWord = firstWord.length === stop;
      const isLeadingSplitCommit =
        previousStop === firstWord.length &&
        stop === firstWord.length + insertedSpace.length &&
        !!change.priorValue &&
        previousValue.endsWith(change.priorValue) &&
        firstWord === previousValue.slice(0, previousValue.length - change.priorValue.length);
      preferFirstPart = isFirstWord || isLeadingSplitCommit;
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

    this.cursor?.handleInputChange(inputValue);
  };

  /**
   * When user changes the selection in the input...
   *
   * Pass this to the selection emitter after instantiation.
   */
  public handleSelectionChange = (selection: UserInputSelectionState) => {
    if (this.mode !== 'edit' || !this.cursor || !isToken(this.cursor.getToken())) return;
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
        // Mainly to update CURSOR_STATE eg "[foo]" => " " ==> moveNext
        this.cursor?.handleInputChange(token.getValue(tok));
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

  // Actions

  /**
   * Handle the user pressing Enter based on the current editing context.
   *
   * - view mode: enter edit mode from the current FOCUS
   * - edit mode on a TOKEN: split before the current TOKEN
   * - edit mode on a non-TOKEN target: descend into that target
   */
  handleEnter(): Result<void, EditManagerError> {
    if (this.mode === 'view') {
      return this.enterEditing();
    }

    if (!this.cursor) {
      return this.enterEditing();
    }

    const current = this.cursor.getToken();
    if (isToken(current)) {
      this.cursor.splitAtToken();
      return ok(undefined);
    }

    return this.enterEditing(current);
  }

  handleExit() {
    if (this.mode === 'edit') {
      this.exitEditing();
    }
  }

  handleLeft() {
    if (this.mode === 'edit') {
      this.cursor?.movePrevious();
      return;
    }

    this.nav.REC_PREV();
  }

  handleRight() {
    if (this.mode === 'edit') {
      this.cursor?.moveNext();
      return;
    }

    this.nav.REC_NEXT();
  }

  handleDown() {
    this.nav.SIB_NEXT();
  }

  handleUp() {
    this.nav.SIB_PREV();
  }

  handleParent() {
    this.nav.UP();
  }
}
