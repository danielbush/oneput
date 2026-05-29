import { CursorState, type CursorInsertState, type CursorParams } from './CursorState.js';
import { CursorTextOps, type CursorDeleteOpts } from './CursorTextOps.js';
import type { UserInputOpts, UserInputSelectionState } from '../input/UserInput.js';
import { type UndoRecord } from '../undo/index.js';
import type { EditorState } from '../editor/EditorState.js';

/**
 * Public CURSOR facade for the editing session.
 */
export class Cursor {
  static create(state: EditorState, params: CursorParams) {
    const cursorState = new CursorState(params);
    const ops = CursorTextOps.create(state, cursorState);
    return new Cursor(cursorState, ops);
  }

  static createNull(state: EditorState, params: CursorParams) {
    const cursorState = new CursorState(params);
    const ops = CursorTextOps.create(state, cursorState);
    return new Cursor(cursorState, ops);
  }

  #state: CursorState;
  #ops: CursorTextOps;

  constructor(cursorState: CursorState, ops: CursorTextOps) {
    this.#state = cursorState;
    this.#ops = ops;
  }

  _undo = (result?: UndoRecord) => {
    this.#state.undo?.record(result);
    return result;
  };

  destroy = () => this.#state.destroy();
  place = (el: HTMLElement, opts?: UserInputOpts) => this.#state.place(el, opts);
  getPlace = () => this.#state.getPlace();
  reload = () => this.#state.reload();
  isSameLine = (tok: HTMLElement) => this.#state.isSameLine(tok);
  isOnToken = () => this.#state.isOnToken();

  // insertion states
  setInsertState = (state: CursorInsertState | null) => this.#state.setInsertState(state);
  setStateFromInput = (input: string) => this.#state.setStateFromInput(input);
  setStateFromSelection = (sel: UserInputSelectionState) => this.#state.setStateFromSelection(sel);
  isInInsertState = () => this.#state.isInInsertState();
  isPrepend = () => this.#state.isPrepend();
  isAppend = () => this.#state.isAppend();
  isInsertingAfter = () => this.#state.isInsertingAfter();
  isInsertingBefore = () => this.#state.isInsertingBefore();

  // motion
  moveNext = () => this.#ops.moveNext();
  movePrevious = () => this.#ops.movePrevious();

  // edit text
  delete = (opts?: CursorDeleteOpts) => this._undo(this.#ops.delete(opts));
  replaceWithText = (text: string, opts?: UserInputOpts) =>
    this._undo(this.#ops.replaceWithText(text, opts));
  insertTextAfter = (text: string, opts?: UserInputOpts) =>
    this._undo(this.#ops.insertTextAfter(text, opts));
  insertTextBefore = (text: string, opts?: UserInputOpts) => this.#ops.insertTextBefore(text, opts);
  splitAtToken = () => this.#ops.splitAtToken();

  // TODO: not used - delete or add to editor?
  insertElementAfter = (el: HTMLElement) => this.#ops.insertElementAfter(el);
  insertElementBefore = (el: HTMLElement) => this.#ops.insertElementBefore(el);
  joinNext = () => this.#ops.joinNext();
  joinPrevious = () => this.#ops.joinPrevious();
}
