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

  // Editor Lifecycle
  start = () => this.state.start(); // initialize
  suspend = (bool: boolean) => this.state.suspend(bool);
  destroy = () => this.state.destroy();

  // modes - view, edit
  enterEditing = (el: HTMLElement) => this.state.enterEditing(el);
  exitEditing = () => this.state.exitEditing();
  getMode = () => this.state.getMode();
  isEditing = () => this.state.isEditing();

  // editing
  handleEnter = () => this.state.ops.handleEnter();
  handleExit = (params?: { softExit: boolean }) => this.state.ops.handleExit(params);
  scrollActiveTargetIntoView = () => this.state.ops.scrollActiveTargetIntoView();
  get cursor() {
    return this.state.cursor;
  }

  // motion
  moveUp = () => this.state.ops.moveUp();
  moveDown = () => this.state.ops.moveDown();
  moveNext = () => this.state.ops.moveNext();
  movePrevious = () => this.state.ops.movePrevious();

  // selection
  extendNext = () => this.state.ops.extendNext();
  extendPrevious = () => this.state.ops.extendPrevious();

  // misc
  enableElementIndicator = (bool: boolean) => this.state.enableElementIndicator(bool);
  get elementIndicatorEnabled() {
    return this.state.elementIndicatorEnabled;
  }
  enableLegacyElementIndicator = (bool: boolean) => this.state.enableLegacyElementIndicator(bool);
  get legacyElementIndicatorEnabled() {
    return this.state.legacyElementIndicatorEnabled;
  }
}
