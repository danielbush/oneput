import { Nav } from './Nav.js';
import type { JsedDocument } from './types.js';
import type { UserInput } from './UserInput.js';
import { EditorFocusOps } from './EditorFocusOps.js';
import { EditorAnchorOps } from './EditorAnchorOps.js';
import { EditorCursorOps } from './EditorCursorOps.js';
import { EditorEventsEmitter } from './EditorEventsEmitter.js';
import { EditorState } from './EditorState.js';

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

  // Initialise (object lifecycle)
  start = () => this.state.start();
  suspend = (bool: boolean) => this.state.suspend(bool);
  destroy = () => this.state.destroy();

  // modes - view, edit
  enterEditing = (el: HTMLElement) => this.state.enterEditing(el);
  exitEditing = () => this.state.exitEditing();
  getMode = () => this.state.getMode();
  isEditing = () => this.state.isEditing();

  // editing
  get cursor() {
    return this.state.cursor;
  }
  handleEnter = () => this.state.ops.handleEnter();
  handleExit = (params?: { softExit: boolean }) => this.state.ops.handleExit(params);
  scrollActiveTargetIntoView = () => this.state.ops.scrollActiveTargetIntoView();

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
  elementIndicatorEnabled = this.state.elementIndicatorEnabled;
  enableLegacyElementIndicator = (bool: boolean) => this.state.enableLegacyElementIndicator(bool);
  legacyElementIndicatorEnabled = this.state.legacyElementIndicatorEnabled;
}
