import { err, ok, Result } from 'neverthrow';
import { isCursorTransparent, isLineSibling, isToken } from './lib/taxonomy.js';
import { findNextEditableLine, getFirstLineSibling, getLine } from './lib/line.js';
import { Nav } from './Nav.js';
import { Cursor } from './Cursor.js';
import { CursorSelection } from './CursorSelection.js';
import { Tokenizer } from './Tokenizer.js';
import type { JsedDocument } from './types.js';
import type { UserInput } from './UserInput.js';
import { EditorFocusOps } from './EditorFocusOps.js';
import { EditorAnchorOps } from './EditorAnchorOps.js';
import { EditorCursorOps } from './EditorCursorOps.js';
import { ElementIndicator } from './ElementIndicator.js';
import { CSSElementIndicator } from './CSSElementIndicator.js';
import type { CursorError } from './CursorState.js';
import { EditorInputOps } from './EditorInputOps.js';
import { EditorEventsEmitter } from './EditorEventsEmitter.js';
import { EditorController } from './EditorController.js';

export type EditorError = { type: 'no-token-under-focus' } | CursorError;
export type EditorMode = 'view' | 'edit';
export type EditorTextChangeEvent =
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
export type EditorElementChangeEvent =
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
export class Editor {
  static create({ document, userInput }: { document: JsedDocument; userInput: UserInput }): Editor {
    const nav = Nav.create(document);
    const elementIndicator = ElementIndicator.create();
    const cssElementIndicator = CSSElementIndicator.create();
    return new Editor(
      document,
      userInput,
      nav,
      Tokenizer.create(),
      elementIndicator,
      cssElementIndicator
    );
  }

  static createNull({
    document,
    userInput
  }: {
    document: JsedDocument;
    userInput: UserInput;
  }): Editor {
    const nav = Nav.createNull(document);
    const elementIndicator = ElementIndicator.createNull();
    const cssElementIndicator = CSSElementIndicator.createNull();
    return new Editor(
      document,
      userInput,
      nav,
      Tokenizer.createNull(),
      elementIndicator,
      cssElementIndicator
    );
  }

  cursor?: Cursor;
  selection?: CursorSelection;
  mode: EditorMode = 'view';
  isSuspended: boolean = false;
  focus: EditorFocusOps;
  anchor: EditorAnchorOps;
  cursorOps: EditorCursorOps;
  inputOps: EditorInputOps;
  /**
   * Uses ElementIndicator.
   */
  useLegacyElementIndicator: boolean = false;
  /**
   * Modern CSS Anchors.
   */
  useElementIndicator: boolean = false;

  constructor(
    public document: JsedDocument,
    public userInput: UserInput,
    public nav: Nav,
    public tokenizer: Tokenizer = Tokenizer.create(),
    public legacyElementIndicator: ElementIndicator,
    public cssElementIndicator: CSSElementIndicator,
    public eventsEmitter: EditorEventsEmitter = EditorEventsEmitter.create(),
    public controller: EditorController = EditorController.create(this)
  ) {
    this.focus = EditorFocusOps.create(this);
    this.anchor = EditorAnchorOps.create(this);
    this.cursorOps = EditorCursorOps.create(this);
    this.inputOps = EditorInputOps.create(this);
  }

  getMode(): EditorMode {
    return this.mode;
  }

  private setMode(mode: EditorMode) {
    this.mode = mode;
    this.eventsEmitter.onModeChange?.(mode);
  }

  start(): void {
    this.nav.connect({
      onRequestFocus: (evt) => this.controller.onFocusRequest(evt),
      onFocusChange: (focus) => this.controller.onFocusChange(focus)
    });
    this.legacyElementIndicator.showIndicator(this.useLegacyElementIndicator && true);
    this.cssElementIndicator.showIndicator(this.useElementIndicator && true);
    this.nav.FOCUS(
      findNextEditableLine(this.document.root, this.document.root) ?? this.document.root
    );
  }

  suspend(bool: boolean) {
    this.isSuspended = bool;
    if (this.isSuspended) {
      this.userInput.setInputValue('');
      return;
    }
    if (this.mode === 'edit') {
      this.enterEditing(this.cursor?.getPlace());
      this.legacyElementIndicator.showIndicator(this.useLegacyElementIndicator && true);
      this.cssElementIndicator.showIndicator(this.useElementIndicator && true);
    }
  }

  destroy() {
    this.cursor?.destroy();
    this.tokenizer.setCursorElement(null);
    this.nav.destroy();
    this.tokenizer.destroy();
    this.legacyElementIndicator.destroy();
    this.cssElementIndicator.destroy();
    this.controller.unsubscribeAll();
    this.eventsEmitter.destroy();
  }

  isEditing(): boolean {
    return this.mode === 'edit';
  }

  /**
   * Put CURSOR on first LINE associated with `initial`.
   *
   * If `initial` is a TOKEN, the CURSOR will be placed on that token.
   * If `initial` is a FOCUSABLE, the CURSOR will be placed on the first
   * LINE_SIBLING reachable from the focused LINE.
   */
  enterEditing(initial?: HTMLElement): Result<void, EditorError> {
    this.nav.connect({
      onRequestFocus: (evt) => this.controller.onFocusRequest(evt),
      onFocusChange: (focus) => this.controller.onFocusChange(focus)
    });
    initial = initial ?? this.nav.getFocus() ?? undefined;
    if (!initial) {
      return err({ type: 'no-token-under-focus' });
    }
    this.controller.unsubscribeAll();
    this.controller.subscribeAll();

    // Tokenize LINE at or within `initial` if not already.
    const line = findNextEditableLine(initial, this.document.root);
    const firstLineSibling = line && this.tokenizer.tokenizeLineAt(line);
    const targetLineSibling = isLineSibling(initial)
      ? initial
      : isCursorTransparent(initial)
        ? getFirstLineSibling(initial)
        : firstLineSibling;
    if (targetLineSibling) {
      const line = getLine(targetLineSibling);
      this.nav.FOCUS(line);
      this.userInput.focus();
      if (!this.cursor) {
        this.cursor = Cursor.create({
          document: this.document,
          tokenizer: this.tokenizer,
          token: targetLineSibling,
          onCursorChange: this.controller.onCursorChange,
          onError: this.controller.onCursorError
        });
      }
      this.cursor.place(targetLineSibling); // calls handleCursorChange
      this.setMode('edit');
      return ok(undefined);
    }

    return err({ type: 'no-token-under-focus' });
  }

  exitEditing(params?: { softExit?: boolean; focusElement?: HTMLElement }) {
    // Exit cursor insertion state if present.
    if (params?.softExit && this.cursor?.isInInsertState()) {
      this.cursor.reload();
      return;
    }

    // Exit the cursor completely
    const focusElement = params?.focusElement ?? this.nav.getFocus() ?? undefined;
    this.controller.unsubscribeAll();
    this.cursor?.destroy();
    this.cursor = undefined;
    this.tokenizer.setCursorElement(null);
    this.userInput.setInputValue('');
    this.setMode('view');

    if (focusElement) {
      this.nav.FOCUS(focusElement);
      const line = findNextEditableLine(focusElement, this.document.root);
      if (line) {
        this.tokenizer.tokenizeLineAt(line);
      }
    }
  }

  notifyTextChange(event: EditorTextChangeEvent) {
    this.eventsEmitter.onTextChange?.(event);
  }

  notifyElementChange(event: EditorElementChangeEvent) {
    this.eventsEmitter.onElementChange?.(event);
  }

  /**
   * Handle the user pressing Enter based on the current editing context.
   *
   * - view mode: enter edit mode from the current FOCUS
   * - edit mode on a TOKEN: split before the current TOKEN
   * - edit mode on a non-TOKEN target: descend into that target
   */
  handleEnter(): Result<void, EditorError> {
    // This allows us to edit via the "Edit..." menu .
    if (this.mode === 'view') {
      return this.enterEditing();
    }

    if (!this.cursor) {
      return this.enterEditing();
    }

    if (this.isSuspended) return ok(undefined);
    const current = this.cursor.getPlace();
    if (isToken(current)) {
      this.cursorOps.splitAtCursor();
      return ok(undefined);
    }

    return this.enterEditing(current);
  }

  handleExit({ softExit }: { softExit: boolean } = { softExit: true }) {
    if (this.selection) {
      // Cancel selection: collapse wrappers and land the CURSOR on the head
      // (wherever the selection was extended to). Keeps edit mode.
      this.cancelSelectionAt(this.selection.getHead());
      return;
    }
    if (this.mode === 'edit') {
      this.exitEditing({ softExit });
    }
  }

  /**
   * Collapse any active selection and move the CURSOR to `target`.
   * Returns true if a selection was cancelled. Stays in edit mode.
   */
  private cancelSelectionAt(target: HTMLElement): boolean {
    if (!this.selection) return false;
    this.selection.collapse();
    this.selection = undefined;
    this.cursor?.place(target);
    return true;
  }

  /**
   * Extend the SELECTION one LINE_SIBLING forward from the current CURSOR.
   *
   * Stub for the selections feature (work/active/20260414.feat.selections.md).
   * When implemented, this will seed a CursorSelection from the current TOKEN
   * on first call and grow (or shrink) its head via LINE_SIBLING traversal on
   * subsequent calls. Noop outside edit mode.
   */
  extendNext() {
    if (this.isSuspended) return;
    if (this.mode !== 'edit' || !this.cursor) return;
    if (!this.selection) {
      this.selection = CursorSelection.create({
        tokenizer: this.tokenizer,
        seed: this.cursor.getPlace(),
        document: this.document
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
      this.selection = CursorSelection.create({
        tokenizer: this.tokenizer,
        seed: this.cursor.getPlace(),
        document: this.document
      });
    }
    this.selection.extendPrevious();
  }

  movePrevious() {
    if (this.isSuspended) return;
    if (this.selection) {
      this.cancelSelectionAt(this.selection.getBackwardEnd());
      return;
    }
    if (this.mode === 'edit') {
      this.cursor?.movePrevious();
      return;
    }

    this.nav.UP_CHAIN();
  }

  moveNext() {
    if (this.isSuspended) return;
    if (this.selection) {
      this.cancelSelectionAt(this.selection.getForwardEnd());
      return;
    }
    if (this.mode === 'edit') {
      this.cursor?.moveNext();
      return;
    }

    this.nav.DOWN_CHAIN();
  }

  moveDown() {
    if (this.isSuspended) return;
    this.nav.SIB_NEXT();
  }

  moveUp() {
    if (this.isSuspended) return;
    this.nav.SIB_PREV();
  }

  scrollActiveTargetIntoView(): boolean {
    const current = this.cursor?.getPlace();
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

  get legacyElementIndicatorEnabled() {
    return this.useLegacyElementIndicator;
  }
  get elementIndicatorEnabled() {
    return this.useElementIndicator;
  }
  enableLegacyElementIndicator(bool: boolean) {
    const focus = this.nav.getFocus();

    this.useElementIndicator = false;
    this.cssElementIndicator.showIndicator(false);

    this.useLegacyElementIndicator = bool;
    if (focus) {
      this.legacyElementIndicator.showIndicator(bool);
    } else {
      this.legacyElementIndicator.showIndicator(false);
    }
  }
  enableElementIndicator(bool: boolean) {
    const focus = this.nav.getFocus();

    this.useLegacyElementIndicator = false;
    this.legacyElementIndicator.showIndicator(false);

    this.useElementIndicator = bool;
    if (focus) {
      this.cssElementIndicator.showIndicator(bool);
    } else {
      this.cssElementIndicator.showIndicator(false);
    }
  }
}
