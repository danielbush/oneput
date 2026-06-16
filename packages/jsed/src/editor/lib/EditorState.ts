import { Nav } from '../../focus/Nav.js';
import { Cursor } from '../../cursor/Cursor.js';
import { Tokenizer } from '../../lib/ops/Tokenizer.js';
import type { JsedDocument } from '../../types.js';
import type { UserInput } from '../../input/UserInput.js';
import { EditorFocusOps } from './EditorFocusOps.js';
import { EditorAnchorOps } from './EditorAnchorOps.js';
import { EditorCursorOps } from './EditorCursorOps.js';
import { ElementIndicator } from '../../ui/index.js';
import { CSSElementIndicator } from '../../ui/index.js';
import { EditorEventsEmitter } from './EditorEventsEmitter.js';
import { EditorController } from '../EditorController.js';
import { EditorOps } from './EditorOps.js';
import type { CursorError } from '../../cursor/lib/CursorState.js';
import { UndoRecorder } from '../../lib/undo/UndoRecorder.js';
import { findNextEditableLine, getFirstLineSibling, getLine } from '../../lib/core/line.js';
import { err, ok, type Result } from 'neverthrow';
import { isCursorTransparent, isLineSibling } from '../../lib/core/taxonomy.js';
import { anchorize, removeAnchors } from '../../lib/ops/anchor.js';
import { detokenize } from '../../lib/ops/tokenize.js';
import { addImplicitLines, removeImplicitLines } from '../../lib/ops/implicitLine.js';

export type EditorError = { type: 'no-token-under-focus' } | CursorError;
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

export class EditorState {
  static create({
    document,
    userInput
  }: {
    document: JsedDocument;
    userInput: UserInput;
  }): EditorState {
    const nav = Nav.create(document);
    const elementIndicator = ElementIndicator.create();
    const cssElementIndicator = CSSElementIndicator.create();
    return new EditorState(
      document,
      userInput,
      nav,
      elementIndicator,
      cssElementIndicator,
      Tokenizer.create(),
      UndoRecorder.create()
    );
  }

  static createNull({
    document,
    userInput
  }: {
    document: JsedDocument;
    userInput: UserInput;
  }): EditorState {
    const nav = Nav.createNull(document);
    const elementIndicator = ElementIndicator.createNull();
    const cssElementIndicator = CSSElementIndicator.createNull();
    return new EditorState(
      document,
      userInput,
      nav,
      elementIndicator,
      cssElementIndicator,
      Tokenizer.createNull(),
      UndoRecorder.createNull()
    );
  }

  public isSuspended: boolean = false;
  public cursor?: Cursor;
  /**
   * Uses ElementIndicator.
   */
  public useLegacyElementIndicator: boolean = true;
  /**
   * Modern CSS Anchors.
   */
  public useElementIndicator: boolean = false;

  constructor(
    public document: JsedDocument,
    public userInput: UserInput,
    public nav: Nav,
    public legacyElementIndicator: ElementIndicator,
    public cssElementIndicator: CSSElementIndicator,
    public tokenizer: Tokenizer,
    public undo: UndoRecorder,
    public eventsEmitter = EditorEventsEmitter.create(),
    public controller = EditorController.create(this),
    public focus = EditorFocusOps.create(this),
    public anchor = EditorAnchorOps.create(this),
    public cursorOps = EditorCursorOps.create(this),
    public ops = EditorOps.create(this)
  ) {}

  start(): void {
    this.initializeDocument();
    this.nav.connect({
      onRequestFocus: (evt) => this.controller.onFocusRequest(evt),
      onFocusChange: (focus) => this.controller.onFocusChange(focus)
    });
    this.legacyElementIndicator.showIndicator(this.useLegacyElementIndicator);
    this.cssElementIndicator.showIndicator(this.useElementIndicator);
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
    if (this.cursor) {
      this.enterEditing(this.cursor?.getPlace());
      this.legacyElementIndicator.showIndicator(this.useLegacyElementIndicator && true);
      this.cssElementIndicator.showIndicator(this.useElementIndicator && true);
    }
  }

  /**
   * Create cursor.
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
        this.cursor = Cursor.create(targetLineSibling, {
          document: this.document,
          tokenizer: this.tokenizer,
          undo: this.undo,
          onCursorChange: this.controller.onCursorChange,
          onCursorError: this.controller.onCursorError,
          eventsEmitter: this.eventsEmitter
        });
      }
      this.cursor.place(targetLineSibling); // calls handleCursorChange
      return ok(undefined);
    }

    return err({ type: 'no-token-under-focus' });
  }

  /**
   * Transition back to 'view' mode.
   */
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

    if (focusElement) {
      this.nav.FOCUS(focusElement);
      const line = findNextEditableLine(focusElement, this.document.root);
      if (line) {
        this.tokenizer.tokenizeLineAt(line);
      }
    }
  }

  destroy() {
    this.unInitializeDocument();
    this.cursor?.destroy();
    this.tokenizer.setCursorElement(null);
    this.nav.destroy();
    this.tokenizer.destroy();
    this.legacyElementIndicator.destroy();
    this.cssElementIndicator.destroy();
    this.controller.unsubscribeAll();
    this.eventsEmitter.destroy();
  }

  initializeDocument() {
    addImplicitLines(this.document.root);
    anchorize(this.document.root);
  }

  unInitializeDocument() {
    this.ops.removeArtifacts(this.document.root);
    removeAnchors(this.document.root);
    detokenize(this.document.root);
    removeImplicitLines(this.document.root);
  }

  isEditing(): boolean {
    return !!this.cursor;
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

  get legacyElementIndicatorEnabled() {
    return this.useLegacyElementIndicator;
  }

  get elementIndicatorEnabled() {
    return this.useElementIndicator;
  }
}
