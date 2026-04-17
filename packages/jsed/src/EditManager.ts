import { err, ok, Result } from 'neverthrow';
import * as token from './lib/token.js';
import { decideInputIntent } from './lib/decideInputIntent.js';
import { FocusChainNavigator } from './lib/FocusChainNavigator.js';
import { isCursorTransparent, isIsland, isLine, isToken } from './lib/taxonomy.js';
import { getFirstLineSibling, getLine } from './lib/sibwalk.js';
import { Nav } from './Nav.js';
import { TokenCursor, type TokenCursorError } from './TokenCursor.js';
import { TokenSelection } from './TokenSelection.js';
import { Tokenizer } from './Tokenizer.js';
import type { JsedDocument, JsedFocusRequestEvent } from './types.js';
import type { UserInput, UserInputChange, UserInputSelectionState } from './UserInput.js';
import { Controller } from '../../oneput/src/lib/oneput/controllers/controller.js';

export type EditManagerError = { type: 'no-token-under-focus' } | TokenCursorError;
export type EditManagerMode = 'view' | 'edit';
export type EditManagerTextChangeEvent =
  | {
      type: 'token-text-change';
      token: HTMLElement;
    }
  | {
      type: 'anchor-change';
      anchor: HTMLElement;
      change: 'inserted' | 'removed';
    }
  | {
      type: 'whitespace-change';
      kind: 'leading-space' | 'trailing-space';
      change: 'inserted' | 'removed';
    };
export type EditManagerElementChangeEvent =
  | {
      type: 'focusable-inserted';
      element: HTMLElement;
    }
  | {
      type: 'focusable-removed';
      element: HTMLElement;
    }
  | {
      type: 'focusable-replaced';
      previous: HTMLElement;
      element: HTMLElement;
    };

/**
 * Manages an edit session for a single document.
 *
 * In 'view' mode, user navigates the document and EM will ensure the FOCUS is
 * tokenized so the user can focus the CURSOR at a TOKEN within the FOCUS.  Once
 * the CURSOR is created, EM goes into 'edit' mode and the CURSOR handles
 * tokenizing if it moves past the initial LINE it started on.
 *
 */
export class EditManager {
  static create({
    document,
    userInput,
    onError,
    onModeChange,
    onFocusChange,
    onCursorChange,
    onTextChange,
    onElementChange
  }: {
    document: JsedDocument;
    userInput: UserInput;
    onError?: (err: EditManagerError) => void;
    onModeChange?: (mode: EditManagerMode) => void;
    onFocusChange?: (focus: HTMLElement | null) => void;
    onCursorChange?: (target: HTMLElement) => void;
    onTextChange?: (event: EditManagerTextChangeEvent) => void;
    onElementChange?: (event: EditManagerElementChangeEvent) => void;
  }): EditManager {
    let instance: EditManager;
    const nav = Nav.create(
      document,
      (evt) => instance?.handleFocusRequest(evt),
      (focus) => instance?.handleFocusChange(focus)
    );
    instance = new EditManager(
      document,
      userInput,
      nav,
      onError,
      onModeChange,
      onFocusChange,
      onCursorChange,
      onTextChange,
      onElementChange,
      Tokenizer.create(),
      FocusChainNavigator.create(nav)
    );
    return instance;
  }

  static createNull({
    document,
    userInput,
    onError,
    onModeChange,
    onFocusChange,
    onCursorChange,
    onTextChange,
    onElementChange
  }: {
    document: JsedDocument;
    userInput?: UserInput;
    onError?: (err: EditManagerError) => void;
    onModeChange?: (mode: EditManagerMode) => void;
    onFocusChange?: (focus: HTMLElement | null) => void;
    onCursorChange?: (target: HTMLElement) => void;
    onTextChange?: (event: EditManagerTextChangeEvent) => void;
    onElementChange?: (event: EditManagerElementChangeEvent) => void;
  }): EditManager {
    let instance: EditManager;
    const nav = Nav.createNull(
      document,
      (evt) => instance?.handleFocusRequest(evt),
      (focus) => instance?.handleFocusChange(focus)
    );
    instance = new EditManager(
      document,
      userInput ?? Controller.createNull().input,
      nav,
      onError,
      onModeChange,
      onFocusChange,
      onCursorChange,
      onTextChange,
      onElementChange,
      Tokenizer.createNull(),
      FocusChainNavigator.createNull(nav)
    );
    return instance;
  }

  cursor?: TokenCursor;
  private selection?: TokenSelection;
  private mode: EditManagerMode = 'view';
  private isSuspended: boolean = false;
  private unsubscribeInputChange?: () => void;
  private unsubscribeSelectionChange?: () => void;

  constructor(
    private document: JsedDocument,
    private userInput: UserInput,
    readonly nav: Nav,
    private onError?: (err: EditManagerError) => void,
    private onModeChange?: (mode: EditManagerMode) => void,
    private onFocusChange?: (focus: HTMLElement | null) => void,
    private onCursorChange?: (target: HTMLElement) => void,
    private onTextChange?: (event: EditManagerTextChangeEvent) => void,
    private onElementChange?: (event: EditManagerElementChangeEvent) => void,
    private tokenizer: Tokenizer = Tokenizer.create(),
    private focusChainNavigator: FocusChainNavigator = FocusChainNavigator.create(nav)
  ) {}

  getMode(): EditManagerMode {
    return this.mode;
  }

  private setMode(mode: EditManagerMode) {
    this.mode = mode;
    this.onModeChange?.(mode);
  }

  private notifyTextChange(event: EditManagerTextChangeEvent) {
    this.onTextChange?.(event);
  }

  private notifyElementChange(event: EditManagerElementChangeEvent) {
    this.onElementChange?.(event);
  }

  /**
   * Put CURSOR on first LINE associated with `initial`.
   *
   * If `initial` is a TOKEN, the CURSOR will be placed on that token.
   * If `initial` is a FOCUSABLE, the CURSOR will be placed on the first
   * LINE_SIBLING reachable from the focused LINE.
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

    // Tokenize LINE at or within `initial` if not already.
    const firstLineSibling = this.tokenizer.tokenizeLineAt(initial);
    const targetLineSibling = isToken(initial)
      ? initial
      : isCursorTransparent(initial)
        ? getFirstLineSibling(initial)
        : firstLineSibling;
    if (targetLineSibling) {
      const line = getLine(targetLineSibling);
      this.nav.FOCUS(line);
      this.userInput.focus();
      if (!this.cursor) {
        this.cursor = TokenCursor.create({
          document: this.document,
          tokenizer: this.tokenizer,
          token: targetLineSibling,
          onCursorChange: this.handleCursorChange,
          onError: this.handleCursorError
        });
      } else {
        this.cursor.setToken(targetLineSibling); // calls handleCursorChange
      }
      this.setMode('edit');
      return ok(undefined);
    }

    return err({ type: 'no-token-under-focus' });
  }

  exitEditing(params?: { focusElement?: HTMLElement }) {
    const focusElement = params?.focusElement ?? this.nav.getFocus() ?? undefined;
    this.unsubscribeInputChange?.();
    this.unsubscribeSelectionChange?.();
    this.cursor?.destroy();
    this.cursor = undefined;
    this.tokenizer.setCursorElement(null);
    this.userInput.setInputValue('');
    this.setMode('view');

    if (focusElement) {
      this.nav.FOCUS(focusElement);
      this.tokenizer.tokenizeLineAt(focusElement);
    }
  }

  suspend(bool: boolean) {
    this.isSuspended = bool;
    if (this.isSuspended) {
      this.userInput.setInputValue('');
      return;
    }
    if (this.mode === 'edit') {
      this.enterEditing(this.cursor?.getToken());
    }
  }

  destroy() {
    this.cursor?.destroy();
    this.tokenizer.setCursorElement(null);
    this.nav.destroy();
    this.tokenizer.destroy();
  }

  private enterEditingAtFocus(): Result<void, EditManagerError> {
    return this.enterEditing();
  }

  private enterEditingAtTarget(target: HTMLElement): Result<void, EditManagerError> {
    return this.enterEditing(target);
  }

  // #region Events

  /**
   * When user types in the input...
   *
   * @param {string} inputValue What the user has typed into an html input/textarea
   */
  public handleInputChange = (change: UserInputChange) => {
    if (this.isSuspended) return;
    if (this.mode !== 'edit' || !this.cursor || !isToken(this.cursor.getToken())) return;

    let lastToken: HTMLElement | null = null;
    const currentToken = this.cursor.getToken();
    const currentTokenValue = token.getValue(currentToken);
    const intent = decideInputIntent(change, currentTokenValue);
    // console.log('decided intent', JSON.stringify(intent, null, 2));

    switch (intent.type) {
      case 'move-next-on-space':
        this.cursor.moveNext();
        return;

      case 'delete-current': {
        const current = this.cursor.getToken();
        this.cursor.delete();
        this.notifyTextChange({ type: 'token-text-change', token: current });
        this.cursor?.handleInputChange(intent.inputValue);
        return;
      }

      case 'insert-after-current':
        for (const part of intent.insertedParts.reverse()) {
          const insertedToken = token.createToken(part);
          token.insertAfter(insertedToken, currentToken);
          token.ensureSpaceAfter(currentToken);
          if (!lastToken) {
            lastToken = insertedToken;
          }
        }
        const inserted = lastToken;
        if (inserted) {
          this.notifyTextChange({ type: 'token-text-change', token: inserted });
        }
        break;

      case 'insert-before-current':
        for (const part of intent.insertedParts) {
          const insertedToken = token.createToken(part);
          token.insertBefore(insertedToken, currentToken);
          token.ensureSpaceAfter(insertedToken);
          lastToken = insertedToken;
        }
        if (lastToken) {
          this.notifyTextChange({ type: 'token-text-change', token: lastToken });
        }
        break;

      case 'rewrite-current':
        this.cursor.replace(intent.firstPart);
        for (const part of intent.appendedParts.reverse()) {
          const appendedToken = this.cursor.append(part);
          if (!lastToken) {
            lastToken = appendedToken;
          }
        }
        if (intent.prependedSpace) {
          this.userInput.moveCursorToBeginning();
        }
        this.notifyTextChange({ type: 'token-text-change', token: currentToken });
        break;
    }

    const finalToken =
      intent.finalTokenPreference === 'current-token' ? this.cursor.getToken() : lastToken;

    if (finalToken) {
      this.cursor.setToken(finalToken);
      this.userInput.focus();
      this.userInput
        .setInputValue(token.getValue(finalToken))
        .then(() => {
          this.userInput.selectAll();
          this.nav.FOCUS(finalToken);
          this.userInput.moveCursorToEnd();
          this.cursor?.handleInputChange(intent.inputValue);
        })
        .catch((err) => {
          // TODO: close cursor?
          console.warn('handleInputChange error:', err);
        });
    } else {
      this.cursor?.handleInputChange(intent.inputValue);
    }
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
  private handleCursorChange = (tok: HTMLElement) => {
    this.tokenizer.setCursorElement(tok);
    this.nav?.FOCUS(tok);
    this.onCursorChange?.(tok);
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
        this.enterEditing(evt.element).mapErr((err) => this.onError?.(err));
        return false;
      }

      this.tokenizer.tokenizeLineAt(evt.element);
      return true;
    }

    if (evt.targetType === 'TOKEN') {
      if (currentFocus?.contains(evt.token)) {
        this.enterEditing(evt.token).mapErr((err) => this.onError?.(err));
        return false;
      }
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

      this.cursor.setToken(evt.token); // calls handleCursorChange
      return true;
    }

    return false;
  };

  private handleFocusChange(focus: HTMLElement | null) {
    this.focusChainNavigator.handleFocusChange(focus);
    this.onFocusChange?.(focus);
  }

  /**
   * If the cursor finds itself in an untenable state...
   */
  private handleCursorError = (err: TokenCursorError) => {
    this.onError?.(err);
  };

  /**
   * Handle the user pressing Enter based on the current editing context.
   *
   * - view mode: enter edit mode from the current FOCUS
   * - edit mode on a TOKEN: split before the current TOKEN
   * - edit mode on a non-TOKEN target: descend into that target
   */
  handleEnter(): Result<void, EditManagerError> {
    // This allows us to edit via the "Edit..." menu .
    if (this.mode === 'view') {
      return this.enterEditingAtFocus();
    }

    if (!this.cursor) {
      return this.enterEditingAtFocus();
    }

    if (this.isSuspended) return ok(undefined);
    const current = this.cursor.getToken();
    if (isToken(current)) {
      this.splitAtCursor();
      return ok(undefined);
    }

    return this.enterEditingAtTarget(current);
  }

  handleExit() {
    if (this.isSuspended) return;
    if (this.mode === 'edit') {
      this.exitEditing();
    }
  }

  /**
   * Extend the SELECTION one LINE_SIBLING forward from the current CURSOR.
   *
   * Stub for the selections feature (work/active/20260414.feat.selections.md).
   * When implemented, this will seed a TokenSelection from the current TOKEN
   * on first call and grow (or shrink) its head via LINE_SIBLING traversal on
   * subsequent calls. Noop outside edit mode.
   */
  extendNext() {
    if (this.isSuspended) return;
    if (this.mode !== 'edit' || !this.cursor) return;
    if (!this.selection) {
      this.selection = TokenSelection.create({
        seed: this.cursor.getToken(),
        document: this.document,
        tokenizer: this.tokenizer
      });
    }
    this.selection.extendNext();
  }

  /**
   * Extend the SELECTION one LINE_SIBLING backward from the current CURSOR.
   *
   * See `extendNext` for the full design sketch.
   */
  extendPrevious() {
    if (this.isSuspended) return;
    if (this.mode !== 'edit' || !this.cursor) return;
    if (!this.selection) {
      this.selection = TokenSelection.create({
        seed: this.cursor.getToken(),
        document: this.document,
        tokenizer: this.tokenizer
      });
    }
    this.selection.extendPrevious();
  }

  handleLeft() {
    if (this.isSuspended) return;
    if (this.mode === 'edit') {
      this.cursor?.movePrevious();
      return;
    }

    this.focusChainNavigator.moveUp();
  }

  handleRight() {
    if (this.isSuspended) return;
    if (this.mode === 'edit') {
      this.cursor?.moveNext();
      return;
    }

    this.focusChainNavigator.moveDown();
  }

  handleDown() {
    if (this.isSuspended) return;
    this.nav.SIB_NEXT();
  }

  handleUp() {
    if (this.isSuspended) return;
    this.nav.SIB_PREV();
  }

  // #endregion Events

  // #region Actions

  private splitAtCursor() {
    const inserted = this.cursor?.splitAtToken();
    if (inserted) {
      this.notifyElementChange({ type: 'focusable-inserted', element: inserted });
    }
  }

  revealActiveTarget(): boolean {
    const current = this.cursor?.getToken();
    if (current && isToken(current)) {
      this.document.viewportScroller.scrollIntoViewCentered(current);
      return true;
    }

    const focus = this.nav.getFocus();
    if (!focus) {
      return false;
    }

    this.document.viewportScroller.scrollIntoViewCentered(focus, {
      oversizedVertical: 'start'
    });
    return true;
  }

  insertAnchorAfterTag(): boolean {
    const focus = this.nav.getFocus();
    if (!focus) {
      return false;
    }

    const anchor = token.insertAnchorAfterTag(focus);
    if (!anchor) {
      return false;
    }

    this.notifyTextChange({ type: 'anchor-change', anchor, change: 'inserted' });
    this.enterEditing(anchor).mapErr((err) => this.onError?.(err));
    return true;
  }

  removeAnchorAfterTag(): boolean {
    const focus = this.nav.getFocus();
    if (!focus) {
      return false;
    }

    const anchor = token.removeAnchorAfterTag(focus);
    if (!anchor) {
      return false;
    }

    this.notifyTextChange({ type: 'anchor-change', anchor, change: 'removed' });
    return true;
  }

  insertAnchorBeforeTag(): boolean {
    const focus = this.nav.getFocus();
    if (!focus) {
      return false;
    }

    const anchor = token.insertAnchorBeforeTag(focus);
    if (!anchor) {
      return false;
    }

    this.notifyTextChange({ type: 'anchor-change', anchor, change: 'inserted' });
    this.enterEditing(anchor).mapErr((err) => this.onError?.(err));
    return true;
  }

  removeAnchorBeforeTag(): boolean {
    const focus = this.nav.getFocus();
    if (!focus) {
      return false;
    }

    const anchor = token.removeAnchorBeforeTag(focus);
    if (!anchor) {
      return false;
    }

    this.notifyTextChange({ type: 'anchor-change', anchor, change: 'removed' });
    return true;
  }

  insertSpaceAfterTag(): boolean {
    const focus = this.nav.getFocus();
    if (!focus) {
      return false;
    }

    const inserted = token.insertSpaceAfterTag(focus);
    if (inserted) {
      this.notifyTextChange({
        type: 'whitespace-change',
        kind: 'trailing-space',
        change: 'inserted'
      });
      return true;
    }
    return false;
  }

  removeSpaceAfterTag(): boolean {
    const focus = this.nav.getFocus();
    if (!focus) {
      return false;
    }

    const removed = token.removeSpaceAfterTag(focus);
    if (removed) {
      this.notifyTextChange({
        type: 'whitespace-change',
        kind: 'trailing-space',
        change: 'removed'
      });
      return true;
    }
    return false;
  }

  insertSpaceBeforeTag(): boolean {
    const focus = this.nav.getFocus();
    if (!focus) {
      return false;
    }

    const inserted = token.insertSpaceBeforeTag(focus);
    if (inserted) {
      this.notifyTextChange({
        type: 'whitespace-change',
        kind: 'leading-space',
        change: 'inserted'
      });
      return true;
    }
    return false;
  }

  removeSpaceBeforeTag(): boolean {
    const focus = this.nav.getFocus();
    if (!focus) {
      return false;
    }

    const removed = token.removeSpaceBeforeTag(focus);
    if (removed) {
      this.notifyTextChange({
        type: 'whitespace-change',
        kind: 'leading-space',
        change: 'removed'
      });
      return true;
    }
    return false;
  }

  insertSpaceBeforeCursor(): boolean {
    if (this.mode !== 'edit' || !this.cursor) {
      return false;
    }

    const inserted = this.cursor.insertSpaceBeforeCursor();
    if (inserted) {
      this.notifyTextChange({
        type: 'whitespace-change',
        kind: 'leading-space',
        change: 'inserted'
      });
      return true;
    }
    return false;
  }

  insertSpaceAfterCursor(): boolean {
    if (this.mode !== 'edit' || !this.cursor) {
      return false;
    }

    const inserted = this.cursor.insertSpaceAfterCursor();
    if (inserted) {
      this.notifyTextChange({
        type: 'whitespace-change',
        kind: 'trailing-space',
        change: 'inserted'
      });
      return true;
    }
    return false;
  }

  removeSpaceBeforeCursor(): boolean {
    if (this.mode !== 'edit' || !this.cursor) {
      return false;
    }

    const removed = this.cursor.removeSpaceBeforeCursor();
    if (removed) {
      this.notifyTextChange({
        type: 'whitespace-change',
        kind: 'leading-space',
        change: 'removed'
      });
      return true;
    }
    return false;
  }

  removeSpaceAfterCursor(): boolean {
    if (this.mode !== 'edit' || !this.cursor) {
      return false;
    }

    const removed = this.cursor.removeSpaceAfterCursor();
    if (removed) {
      this.notifyTextChange({
        type: 'whitespace-change',
        kind: 'trailing-space',
        change: 'removed'
      });
      return true;
    }
    return false;
  }

  insertAnchorInLine(): boolean {
    const focus = this.nav.getFocus();
    if (!focus || !token.canInsertAnchorInLine(focus)) {
      return false;
    }

    const [anchor] = token.addAnchors(focus);
    if (!anchor) {
      return false;
    }

    this.notifyTextChange({ type: 'anchor-change', anchor, change: 'inserted' });
    this.enterEditing(anchor).mapErr((err) => this.onError?.(err));
    return true;
  }

  // #endregion Actions

  // #region is*/can* methods

  isEditing(): boolean {
    return this.mode === 'edit';
  }

  canInsertAnchorInLine(): boolean {
    const focus = this.nav.getFocus();
    return !!(focus && token.canInsertAnchorInLine(focus));
  }

  canInsertAnchorAfterTag(): boolean {
    const focus = this.nav.getFocus();
    return !!(focus && token.getAnchorAfterTagInsertionPoint(focus));
  }

  canRemoveAnchorAfterTag(): boolean {
    const focus = this.nav.getFocus();
    return !!(focus && token.getRemovableAnchorAfterTag(focus));
  }

  canInsertSpaceAfterTag(): boolean {
    const focus = this.nav.getFocus();
    return !!(focus && token.canInsertSpaceAfterTag(focus));
  }

  canRemoveSpaceAfterTag(): boolean {
    const focus = this.nav.getFocus();
    return !!(focus && token.getRemovableSpaceAfterTag(focus));
  }

  canInsertAnchorBeforeTag(): boolean {
    const focus = this.nav.getFocus();
    return !!(focus && token.getAnchorBeforeTagInsertionPoint(focus));
  }

  canRemoveAnchorBeforeTag(): boolean {
    const focus = this.nav.getFocus();
    return !!(focus && token.getRemovableAnchorBeforeTag(focus));
  }

  canInsertSpaceBeforeTag(): boolean {
    const focus = this.nav.getFocus();
    return !!(focus && token.canInsertSpaceBeforeTag(focus));
  }

  canRemoveSpaceBeforeTag(): boolean {
    const focus = this.nav.getFocus();
    return !!(focus && token.getRemovableSpaceBeforeTag(focus));
  }

  canInsertSpaceBeforeCursor(): boolean {
    return this.mode === 'edit' && !!this.cursor?.canInsertSpaceBeforeCursor();
  }

  canInsertSpaceAfterCursor(): boolean {
    return this.mode === 'edit' && !!this.cursor?.canInsertSpaceAfterCursor();
  }

  canRemoveSpaceBeforeCursor(): boolean {
    return this.mode === 'edit' && !!this.cursor?.canRemoveSpaceBeforeCursor();
  }

  canRemoveSpaceAfterCursor(): boolean {
    return this.mode === 'edit' && !!this.cursor?.canRemoveSpaceAfterCursor();
  }

  // #endregion is*/can* methods
}
