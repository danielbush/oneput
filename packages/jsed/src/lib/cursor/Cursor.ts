import { CursorState, type CursorInsertState } from './CursorState.js';
import { type CursorDeleteOpts } from './CursorTextOps.js';
import type { UserInputOpts, UserInputSelectionState } from '../input/UserInput.js';
import { type UndoRecord } from '../undo/index.js';
import type { EditorState } from '../editor/EditorState.js';

/**
 * Public CURSOR facade for the editing session.
 */
export class Cursor {
  static create(seat: HTMLElement, state: EditorState) {
    const cursorState = new CursorState(
      state,
      seat,
      state.controller.onCursorChange,
      state.controller.onCursorError
    );
    return new Cursor(state, cursorState);
  }

  static createNull(seat: HTMLElement, state: EditorState) {
    const cursorState = new CursorState(
      state,
      seat,
      state.controller.onCursorChange,
      state.controller.onCursorError
    );
    return new Cursor(state, cursorState);
  }

  constructor(
    private editorState: EditorState,
    private state: CursorState
  ) {}

  _undo = (result?: UndoRecord) => {
    this.editorState.undo?.record(result);
    return result;
  };

  destroy = () => this.state.destroy();
  place = (el: HTMLElement, opts?: UserInputOpts) => this.state.place(el, opts);
  getPlace = () => this.state.getPlace();
  reload = () => this.state.reload();
  isSameLine = (tok: HTMLElement) => this.state.isSameLine(tok);
  isOnToken = () => this.state.isOnToken();

  // insertion states
  setInsertState = (state: CursorInsertState | null) => this.state.setInsertState(state);
  setStateFromInput = (input: string) => this.state.setStateFromInput(input);
  setStateFromSelection = (sel: UserInputSelectionState) => this.state.setStateFromSelection(sel);
  isInInsertState = () => this.state.isInInsertState();
  isPrepend = () => this.state.isPrepend();
  isAppend = () => this.state.isAppend();
  isInsertingAfter = () => this.state.isInsertingAfter();
  isInsertingBefore = () => this.state.isInsertingBefore();

  // motion
  moveNext = () => this.state.ops.moveNext();
  movePrevious = () => this.state.ops.movePrevious();

  // edit text
  delete = (opts?: CursorDeleteOpts) => this._undo(this.state.ops.delete(opts));
  replaceWithText = (text: string, opts?: UserInputOpts) =>
    this._undo(this.state.ops.replaceWithText(text, opts));
  insertTextAfter = (text: string, opts?: UserInputOpts) =>
    this._undo(this.state.ops.insertTextAfter(text, opts));
  insertTextBefore = (text: string, opts?: UserInputOpts) =>
    this.state.ops.insertTextBefore(text, opts);
  splitAtToken = () => this.state.ops.splitAtToken();

  // TODO: not used - delete or add to editor?
  insertElementAfter = (el: HTMLElement) => this.state.ops.insertElementAfter(el);
  insertElementBefore = (el: HTMLElement) => this.state.ops.insertElementBefore(el);
  joinNext = () => this.state.ops.joinNext();
  joinPrevious = () => this.state.ops.joinPrevious();
}
