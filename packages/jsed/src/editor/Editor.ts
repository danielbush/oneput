import { Nav } from '../focus/Nav.js';
import type { JsedDocument } from '../types.js';
import type { UserInput } from '../input/UserInput.js';
import { EditorFocusOps } from './lib/EditorFocusOps.js';
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

  /**
   * Broadcast events to non-jsed observers.
   */
  eventsEmitter: EditorEventsEmitter;

  constructor(public state: EditorState) {
    this.nav = this.state.nav;
    this.focusOps = this.state.focusOps;
    this.cursorOps = this.state.cursorOps;
    this.eventsEmitter = this.state.eventsEmitter;
  }

  // Lifecycle
  start = () => this.state.start(); // initialize
  suspend = (bool: boolean) => this.state.suspend(bool);
  destroy = () => this.state.destroy();
  /**
   * Returns html ready to be persisted.
   *
   * Can be repeatedly run during the edit session.
   * Fairly heavy operation (clone, strip, serialize to string), so call it on a
   * longish debounce.
   */
  serialize = () => this.state.serialize();

  // Modes - view, edit
  isEditing = () => this.state.isEditing();
  enterEditing = (el?: HTMLElement) => this.state.enterEditing(el);
  exitEditing = (params?: { softExit?: boolean; focusElement?: HTMLElement }) =>
    this.state.exitEditing(params);
  getCursor = () => this.state.cursor;
  handleExit = (params?: { softExit: boolean }) => this.state.ops.handleExit(params);

  // Editing
  /**
   * "At FOCUS" operations
   */
  focusOps: EditorFocusOps;
  /**
   * "At CURSOR" operations
   */
  cursorOps: EditorCursorOps;
  handleEnter = () => this.state.ops.handleEnter();
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
  /**
   * Run several editor operations as one atomic undo/redo change.
   *
   * A false result or thrown error rolls captured operations back immediately
   * and leaves the existing undo/redo history unchanged.
   */
  transaction = (run: () => boolean): boolean => {
    this.state.undo.beginGroup();
    try {
      const succeeded = run();
      if (succeeded) {
        this.state.undo.commitGroup();
        return true;
      }
      this.rollbackTransaction();
      return false;
    } catch (error) {
      this.rollbackTransaction();
      throw error;
    }
  };

  /**
   * Roll an active transaction back in reverse operation order.
   */
  private rollbackTransaction(): void {
    const records = this.state.undo.cancelGroup();
    for (let index = records.length - 1; index >= 0; index -= 1) {
      records[index]?.undo(this.state);
    }
  }

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
