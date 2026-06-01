import type { UserInputOpts } from '../input/UserInput';
import type { CursorState } from './CursorState';
import type { EditorState } from '../editor/EditorState.js';
import type { UndoRecord } from '../undo/UndoRecorder.js';
import { isTextEdit } from './mergeable.js';
import {
  createToken,
  insertAfter,
  redoInsertAfter,
  redoReplaceText,
  replaceText,
  undoInsertAfter,
  undoReplaceText,
  type InsertTokenAfter,
  type ReplaceText
} from '../ops/token.js';

export class ReplaceWithText implements UndoRecord {
  static run(state: CursorState, text: string, opts?: UserInputOpts) {
    if (!state.isOnToken()) return;
    const currentToken = state.getPlace();
    const [firstPart, ...parts] = text.split(/\s+/).filter(Boolean);
    if (!firstPart) return;
    const firstWord = replaceText(currentToken, firstPart);
    let lastToken: HTMLElement = currentToken;
    let insertAfters: InsertTokenAfter[] = [];
    for (const part of parts.reverse()) {
      const insertedToken = createToken(part);
      const result = insertAfter(insertedToken, currentToken);
      insertAfters.push(result);
      if (lastToken === currentToken) {
        lastToken = insertedToken;
      }
    }
    state.place(lastToken, opts);
    return new ReplaceWithText(
      {
        undo: currentToken,
        redo: lastToken
      }, //
      firstWord,
      insertAfters,
      opts
    );
  }

  readonly action = 'ReplaceWithText';

  constructor(
    public cursorTarget: {
      undo: HTMLElement;
      redo: HTMLElement;
    },
    /**
     * The first word in the text.
     */
    public replaceText: ReplaceText,
    /**
     * Any subsequent words in the text.
     */
    public insertTokensAfter: InsertTokenAfter[],
    public opts?: UserInputOpts
  ) {}

  undo(state: EditorState) {
    undoReplaceText(this.replaceText);
    for (const i of this.insertTokensAfter) {
      undoInsertAfter(i);
    }
    state.cursor?.place(this.cursorTarget.undo, this.opts);
  }

  redo(state: EditorState) {
    redoReplaceText(this.replaceText);
    for (const i of this.insertTokensAfter) {
      redoInsertAfter(i);
    }
    state.cursor?.place(this.cursorTarget.redo, this.opts);
  }

  merge(next: UndoRecord): UndoRecord | void {
    if (this.insertTokensAfter.length > 0) {
      // Several words replaced the current token.  There is no merging in this
      // situation.
      return;
    }
    if (!isTextEdit(next)) return;
    if (next.action === 'ReplaceWithText' && this.replaceText.token === next.replaceText.token) {
      // this.replaceText.before - the earliest state of the token
      // next.replaceText.after - the latest state of the token
      this.replaceText.after = next.replaceText.after;
      return this;
    }
    return;
  }
}
