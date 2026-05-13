import { Nav } from './Nav.js';
import type { JsedDocument } from './types.js';
import type { UserInput } from './UserInput.js';
import { EditorFocusOps } from './lib/editor/EditorFocusOps.js';
import { EditorAnchorOps } from './lib/editor/EditorAnchorOps.js';
import { EditorCursorOps } from './lib/editor/EditorCursorOps.js';
import { EditorEventsEmitter } from './lib/editor/EditorEventsEmitter.js';
import { EditorState } from './lib/editor/EditorState.js';

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
  start = () => this.state.ops.start(); // initialize
  suspend = (bool: boolean) => this.state.ops.suspend(bool);
  destroy = () => this.state.destroy();

  // Modes - view, edit
  getMode = () => this.state.getMode();
  isEditing = () => this.state.isEditing();
  enterEditing = (el?: HTMLElement) => this.state.ops.enterEditing(el);
  exitEditing = (params?: { softExit?: boolean; focusElement?: HTMLElement }) =>
    this.state.ops.exitEditing(params);

  // Multi-function
  handleEnter = () => this.state.ops.handleEnter();
  handleExit = (params?: { softExit: boolean }) => this.state.ops.handleExit(params);

  // Editing
  getCursor = () => this.state.getCursor();
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
