import { CursorState, type CursorError, type CursorInsertState } from './lib/CursorState.js';
import { type CursorDeleteOpts } from './lib/CursorTextOps.js';
import { DeleteAtCursor } from './lib/DeleteAtCursor.js';
import type { UserInputOpts, UserInputSelectionState } from '../input/UserInput.js';
import { UndoRecorder, type UndoRecord } from '../undo/index.js';
import type { JsedDocument } from '../JsedDocument.js';
import type { Tokenizer } from '../lib/ops/Tokenizer.js';
import type { EditorEventsEmitter } from '../editor/index.js';
import { ReplaceWithText } from './lib/ReplaceWithText.js';
import { InsertTextAfter } from './lib/InsertTextAfter.js';
import { InsertTextBefore } from './lib/InsertTextBefore.js';
import { SplitAtToken } from './lib/SplitAtToken.js';
import { Wrap } from './lib/Wrap.js';

/**
 * Public CURSOR facade for the editing session.
 */
export class Cursor {
  static create(
    seat: HTMLElement,
    params: {
      document: JsedDocument;
      tokenizer: Tokenizer;
      onCursorChange: (el?: HTMLElement) => void;
      onCursorError: (err: CursorError) => void;
      eventsEmitter: EditorEventsEmitter;
      undo: UndoRecorder;
    }
  ) {
    const cursorState = new CursorState(
      seat,
      params.document,
      params.tokenizer,
      params.undo,
      params.onCursorChange,
      params.onCursorError,
      params.eventsEmitter
    );
    return new Cursor(cursorState);
  }

  constructor(private state: CursorState) {}

  private _undo = <K extends UndoRecord>(result?: K) => {
    this.state.undo?.record(result);
    return result;
  };

  destroy = () => this.state.destroy();
  place = (el: HTMLElement, opts?: UserInputOpts) => this.state.place(el, opts);
  getPlace = () => this.state.getPlace();
  getSelection = () => this.state.getSelection();
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
  delete = (opts?: CursorDeleteOpts) => this._undo(DeleteAtCursor.run(this.state, opts));
  replaceWithText = (text: string, opts?: UserInputOpts) =>
    this._undo(ReplaceWithText.run(this.state, text, opts));
  insertTextAfter = (text: string, opts?: UserInputOpts) =>
    this._undo(InsertTextAfter.run(this.state, text, opts));
  insertTextBefore = (text: string, opts?: UserInputOpts) =>
    this._undo(InsertTextBefore.run(this.state, text, opts));
  splitAtToken = () => this._undo(SplitAtToken.run(this.state));
  wrap = (tagName: string) => this._undo(Wrap.run(this.state, tagName));

  // selections
  extendNext = () => this.state.ops.extendNext();
  extendPrevious = () => this.state.ops.extendPrevious();
  cancelSelection = () => this.state.cancelSelection();
  canWrap = () => this.state.ops.canWrap();
  getWrapCandidates = () => this.state.ops.getWrapCandidates();
}
