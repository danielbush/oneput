import { Nav } from '../lib/focus/Nav.js';
import type { JsedDocument } from '../types.js';
import type { UserInput } from '../input/UserInput.js';
import { EditorFocusOps } from './lib/EditorFocusOps.js';
import { EditorAnchorOps } from './lib/EditorAnchorOps.js';
import { EditorCursorOps } from './lib/EditorCursorOps.js';
import { EditorEventsEmitter } from './lib/EditorEventsEmitter.js';
import { EditorState } from './lib/EditorState.js';

/**
 * Facade that represents an editor instance for a single "document".
 */
export class Editor {
  static create({ document, userInput }: { document: JsedDocument; userInput: UserInput }): Editor {
    const state = EditorState.create({ document, userInput });
    return new Editor(state);
  }

  static createNull({
    document,
    userInput
  }: {
    document: JsedDocument;
    userInput: UserInput;
  }): Editor {
    const state = EditorState.createNull({ document, userInput });
    return new Editor(state);
  }

  nav: Nav;
  focus: EditorFocusOps;
  anchor: EditorAnchorOps;
  cursorOps: EditorCursorOps;
  eventsEmitter: EditorEventsEmitter;

  constructor(public state: EditorState) {
    this.nav = this.state.nav;
    this.focus = this.state.focus;
    this.anchor = this.state.anchor;
    this.cursorOps = this.state.cursorOps;
    this.eventsEmitter = this.state.eventsEmitter;
  }

  // Lifecycle
  start = () => this.state.start(); // initialize
  suspend = (bool: boolean) => this.state.suspend(bool);
  destroy = () => this.state.destroy();

  // Modes - view, edit
  isEditing = () => this.state.isEditing();
  enterEditing = (el?: HTMLElement) => this.state.enterEditing(el);
  exitEditing = (params?: { softExit?: boolean; focusElement?: HTMLElement }) =>
    this.state.exitEditing(params);
  getCursor = () => this.state.cursor;

  // Multi-function
  handleEnter = () => this.state.ops.handleEnter();
  handleExit = (params?: { softExit: boolean }) => this.state.ops.handleExit(params);

  // Editing
  handleDelete = (evt?: KeyboardEvent) => this.state.ops.handleDelete(evt);
  // Editing is event driven see EditorController.

  // Motion
  moveUp = () => this.state.ops.moveUp();
  moveDown = () => this.state.ops.moveDown();
  moveNext = () => this.state.ops.moveNext();
  movePrevious = () => this.state.ops.movePrevious();

  // Selection
  extendNext = () => this.state.ops.extendNext();
  extendPrevious = () => this.state.ops.extendPrevious();

  // Misc
  canUndo = () => this.state.undo.canUndo();
  canRedo = () => this.state.undo.canRedo();
  undo = () => this.state.ops.undo();
  redo = () => this.state.ops.redo();
  scrollActiveTargetIntoView = () => this.state.ops.scrollActiveTargetIntoView();
  enableElementIndicator = (bool: boolean) => this.state.enableElementIndicator(bool);
  get elementIndicatorEnabled() {
    return this.state.elementIndicatorEnabled;
  }
  enableLegacyElementIndicator = (bool: boolean) => this.state.enableLegacyElementIndicator(bool);
  get legacyElementIndicatorEnabled() {
    return this.state.legacyElementIndicatorEnabled;
  }
}
