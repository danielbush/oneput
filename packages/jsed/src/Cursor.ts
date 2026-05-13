import { CursorMotion } from './lib/cursor/CursorMotion.js';
import {
  CursorState,
  type CursorInsertState,
  type CursorParams,
  type CursorChangeOpts
} from './lib/cursor/CursorState.js';
import { CursorTextOps } from './lib/cursor/CursorTextOps.js';
import type { UserInputSelectionState } from './UserInput.js';

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
    this.#motion = CursorMotion.create(cursorState);
    this.#ops = CursorTextOps.create(cursorState);
  }

  destroy = () => this.#state.destroy();
  getDocument = () => this.#state.getDocument();
  place = (el: HTMLElement, opts?: CursorChangeOpts) => this.#state.place(el, opts);
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

  // ops
  delete = (opts?: CursorChangeOpts) => this.#ops.delete(opts);
  replace = (val: string) => this.#ops.replace(val);
  replaceWithText = (text: string, opts?: CursorChangeOpts) =>
    this.#ops.replaceWithText(text, opts);
  insertTextAfter = (text: string, opts?: CursorChangeOpts) =>
    this.#ops.insertTextAfter(text, opts);
  insertTextBefore = (text: string, opts?: CursorChangeOpts) =>
    this.#ops.insertTextBefore(text, opts);
  append = (val: string) => this.#ops.append(val);
  joinNext = () => this.#ops.joinNext();
  joinPrevious = () => this.#ops.joinPrevious();
  splitBefore = () => this.#ops.splitBefore();
  splitAfter = () => this.#ops.splitAfter();
  splitAtToken = () => this.#ops.splitAtToken();
  insertElementAfter = (el: HTMLElement) => this.#ops.insertElementAfter(el);
  insertElementBefore = (el: HTMLElement) => this.#ops.insertElementBefore(el);
}
