import { CursorMotion } from './CursorMotion.js';
import { CursorState, type CursorInsertState, type CursorParams } from './CursorState.js';
import { CursorTextOps, type CursorDeleteOpts } from './CursorTextOps.js';
import type { UserInputOpts, UserInputSelectionState } from '../input/UserInput.js';
import { type UndoRecord } from '../undo/index.js';

/**
 * Public CURSOR facade for the editing session.
 */
export class Cursor {
  static create(params: CursorParams) {
    const cursorState = new CursorState(params);
    return new Cursor(cursorState);
  }

  static createNull(params: CursorParams) {
    const cursorState = new CursorState(params);
    return new Cursor(cursorState);
  }

  #state: CursorState;
  #ops: CursorTextOps;
  #motion: CursorMotion;

  constructor(cursorState: CursorState) {
    this.#state = cursorState;
    this.#motion = this.#state.motion;
    this.#ops = this.#state.ops;
  }

  _undo = (result?: UndoRecord) => {
    this.#state.undo?.record(result);
    return result;
  };

  destroy = () => this.#state.destroy();
  getDocument = () => this.#state.getDocument();
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
  moveNext = () => this.#motion.moveNext();
  movePrevious = () => this.#motion.movePrevious();

  // edit text
  delete = (opts?: CursorDeleteOpts) => this._undo(this.#ops.delete(opts));
  replaceWithText = (text: string, opts?: UserInputOpts) =>
    this._undo(this.#ops.replaceWithText(text, opts));
  insertTextAfter = (text: string, opts?: UserInputOpts) => this.#ops.insertTextAfter(text, opts);
  insertTextBefore = (text: string, opts?: UserInputOpts) => this.#ops.insertTextBefore(text, opts);
  splitAtToken = () => this.#ops.splitAtToken();

  // TODO: not used - delete or add to editor?
  insertElementAfter = (el: HTMLElement) => this.#ops.insertElementAfter(el);
  insertElementBefore = (el: HTMLElement) => this.#ops.insertElementBefore(el);
  joinNext = () => this.#ops.joinNext();
  joinPrevious = () => this.#ops.joinPrevious();
}
