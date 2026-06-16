import type { EditorState } from '../../editor/index.js';
import type { UserInputOpts } from '../../input/UserInput.js';
import {
  createToken,
  insertAfter,
  redoInsertAfter,
  undoInsertAfter,
  type InsertTokenAfter
} from '../../lib/ops/token.js';
import type { UndoRecord } from '../../undo/index.js';
import type { CursorState } from './CursorState.js';
import { ReplaceWithText } from './ReplaceWithText.js';

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

  merge(next: UndoRecord): UndoRecord | void {
    if (this.insertTokensAfter.length !== 1) {
      return;
    }
    const insertAfter = this.insertTokensAfter[0];
    // Merge subsequent text changes into the inserted token.
    if (next instanceof ReplaceWithText) {
      if (next.replaceText.token === insertAfter.token && insertAfter.token.firstChild) {
        insertAfter.token.firstChild.nodeValue = next.replaceText.after;
        return this;
      }
    }
  }
}
