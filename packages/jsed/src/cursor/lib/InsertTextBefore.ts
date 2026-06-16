import type { EditorState } from '../../editor/index.js';
import type { UserInputOpts } from '../../input/UserInput.js';
import {
  createToken,
  insertBefore,
  redoInsertBefore,
  undoInsertBefore,
  type InsertTokenBefore
} from '../../lib/ops/token.js';
import type { UndoRecord } from '../../undo/index.js';
import type { CursorState } from './CursorState.js';
import { ReplaceWithText } from './ReplaceWithText.js';

export class InsertTextBefore implements UndoRecord {
  static run(state: CursorState, text: string, opts?: UserInputOpts) {
    const currentToken = state.getPlace();
    let lastToken: HTMLElement | null = null;
    let insertBefores: InsertTokenBefore[] = [];
    const parts = text.split(/\s+/).filter(Boolean);
    for (const part of parts) {
      const insertedToken = createToken(part);
      const result = insertBefore(insertedToken, currentToken);
      insertBefores.push(result);
      lastToken = insertedToken;
    }
    if (!lastToken) {
      return;
    }
    state.place(lastToken, opts);
    return new InsertTextBefore(
      {
        undo: currentToken,
        redo: lastToken
      },
      insertBefores,
      opts
    );
  }

  constructor(
    public cursorTarget: {
      undo: HTMLElement;
      redo: HTMLElement;
    },
    public insertTokensBefore: InsertTokenBefore[],
    public opts?: UserInputOpts
  ) {}

  undo(state: EditorState) {
    for (const i of this.insertTokensBefore) {
      undoInsertBefore(i);
    }
    state.cursor?.place(this.cursorTarget.undo, this.opts);
  }

  redo(state: EditorState) {
    for (const i of this.insertTokensBefore) {
      redoInsertBefore(i);
    }
    state.cursor?.place(this.cursorTarget.redo, this.opts);
  }

  merge(next: UndoRecord): UndoRecord | void {
    if (this.insertTokensBefore.length !== 1) {
      return;
    }
    const insertBefore = this.insertTokensBefore[0];
    // Merge subsequent text changes into the inserted token.
    if (next instanceof ReplaceWithText) {
      if (next.replaceText.token === insertBefore.token && insertBefore.token.firstChild) {
        insertBefore.token.firstChild.nodeValue = next.replaceText.after;
        return this;
      }
    }
  }
}
