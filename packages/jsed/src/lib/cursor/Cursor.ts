import { CursorState, type CursorInsertState } from './CursorState.js';
import { CursorTextOps, type CursorDeleteOpts } from './CursorTextOps.js';
import type { UserInputOpts, UserInputSelectionState } from '../input/UserInput.js';
import { type UndoRecord } from '../undo/index.js';
import type { EditorState } from '../editor/EditorState.js';

/**
 * Public CURSOR facade for the editing session.
 */
export class Cursor {
  static create(seat: HTMLElement, state: EditorState) {
    const cursorState = new CursorState(seat, {
      onCursorChange: state.controller.onCursorChange,
      onError: state.controller.onCursorError
    });
    const ops = CursorTextOps.create(state, cursorState);
    return new Cursor(state, cursorState, ops);
  }

  static createNull(seat: HTMLElement, state: EditorState) {
    const cursorState = new CursorState(seat, {
      onCursorChange: state.controller.onCursorChange,
      onError: state.controller.onCursorError
    });
    const ops = CursorTextOps.create(state, cursorState);
    return new Cursor(state, cursorState, ops);
  }

  constructor(
    private state: EditorState,
    private cursor: CursorState,
    private ops: CursorTextOps
  ) {}

  _undo = (result?: UndoRecord) => {
    this.state.undo?.record(result);
    return result;
  };

  destroy = () => this.cursor.destroy();
  place = (el: HTMLElement, opts?: UserInputOpts) => this.cursor.place(el, opts);
  getPlace = () => this.cursor.getPlace();
  reload = () => this.cursor.reload();
  isSameLine = (tok: HTMLElement) => this.cursor.isSameLine(tok);
  isOnToken = () => this.cursor.isOnToken();

  // insertion states
  setInsertState = (state: CursorInsertState | null) => this.cursor.setInsertState(state);
  setStateFromInput = (input: string) => this.cursor.setStateFromInput(input);
  setStateFromSelection = (sel: UserInputSelectionState) => this.cursor.setStateFromSelection(sel);
  isInInsertState = () => this.cursor.isInInsertState();
  isPrepend = () => this.cursor.isPrepend();
  isAppend = () => this.cursor.isAppend();
  isInsertingAfter = () => this.cursor.isInsertingAfter();
  isInsertingBefore = () => this.cursor.isInsertingBefore();

  // motion
  moveNext = () => this.ops.moveNext();
  movePrevious = () => this.ops.movePrevious();

  // edit text
  delete = (opts?: CursorDeleteOpts) => this._undo(this.ops.delete(opts));
  replaceWithText = (text: string, opts?: UserInputOpts) =>
    this._undo(this.ops.replaceWithText(text, opts));
  insertTextAfter = (text: string, opts?: UserInputOpts) =>
    this._undo(this.ops.insertTextAfter(text, opts));
  insertTextBefore = (text: string, opts?: UserInputOpts) => this.ops.insertTextBefore(text, opts);
  splitAtToken = () => this.ops.splitAtToken();

  // TODO: not used - delete or add to editor?
  insertElementAfter = (el: HTMLElement) => this.ops.insertElementAfter(el);
  insertElementBefore = (el: HTMLElement) => this.ops.insertElementBefore(el);
  joinNext = () => this.ops.joinNext();
  joinPrevious = () => this.ops.joinPrevious();
}
