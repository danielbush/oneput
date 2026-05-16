import { Nav } from '../focus/Nav.js';
import { Cursor } from '../cursor/Cursor.js';
import { CursorSelection } from '../selection/CursorSelection.js';
import { Tokenizer } from '../token/Tokenizer.js';
import type { JsedDocument } from '../../types.js';
import type { UserInput } from '../input/UserInput.js';
import { EditorFocusOps } from './EditorFocusOps.js';
import { EditorAnchorOps } from './EditorAnchorOps.js';
import { EditorCursorOps } from './EditorCursorOps.js';
import { ElementIndicator } from '../utilities/ElementIndicator.js';
import { CSSElementIndicator } from '../utilities/CSSElementIndicator.js';
import { EditorEventsEmitter } from './EditorEventsEmitter.js';
import { EditorController } from './EditorController.js';
import { EditorOps } from './EditorOps.js';
import type { CursorError } from '../cursor/CursorState.js';
import { UndoRecorder } from '../undo/UndoRecorder.js';

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

  public mode: EditorMode = 'view';
  public isSuspended: boolean = false;
  public cursor?: Cursor;
  public selection?: CursorSelection;
  /**
   * Uses ElementIndicator.
   */
  public useLegacyElementIndicator: boolean = false;
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

  getMode(): EditorMode {
    return this.mode;
  }

  setMode(mode: EditorMode) {
    this.mode = mode;
    this.eventsEmitter.onModeChange?.(mode);
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

  getCursor() {
    return this.cursor?.getPlace();
  }

  notifyTextChange(event: EditorTextChangeEvent) {
    this.eventsEmitter.onTextChange?.(event);
  }

  notifyElementChange(event: EditorElementChangeEvent) {
    this.eventsEmitter.onElementChange?.(event);
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
