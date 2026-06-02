import type { EditorState } from '../editor/EditorState';
import type { UserInputOpts } from '../input/UserInput';
import {
  createToken,
  insertAfter,
  redoInsertAfter,
  undoInsertAfter,
  type InsertTokenAfter
} from '../ops/token';
import type { UndoRecord } from '../undo';
import type { CursorState } from './CursorState';

/**
 * Insert string vals after cursor and put cursor on last one.
 */
export class InsertTextAfter implements UndoRecord {
  static run(state: CursorState, text: string, opts?: UserInputOpts) {
    const currentToken = state.getPlace();
    let lastToken: HTMLElement | null = null;
    let insertAfters: InsertTokenAfter[] = [];
    const parts = text.split(/\s+/).filter(Boolean);
    for (const part of parts.reverse()) {
      const insertedToken = createToken(part);
      const result = insertAfter(insertedToken, currentToken);
      insertAfters.push(result);
      if (!lastToken) {
        lastToken = insertedToken;
      }
    }
    if (!lastToken) {
      return;
    }
    state.place(lastToken, opts);
    return new InsertTextAfter(
      {
        undo: currentToken,
        redo: lastToken
      },
      insertAfters
    );
  }

  constructor(
    public cursorTarget: {
      undo: HTMLElement;
      redo: HTMLElement;
    },
    public insertTokensAfter: InsertTokenAfter[],
    public opts?: UserInputOpts
  ) {}

  undo(state: EditorState) {
    for (const i of this.insertTokensAfter) {
      undoInsertAfter(i);
    }
    state.cursor?.place(this.cursorTarget.undo, this.opts);
  }

  redo(state: EditorState) {
    for (const i of this.insertTokensAfter) {
      redoInsertAfter(i);
    }
    state.cursor?.place(this.cursorTarget.redo, this.opts);
  }
}
