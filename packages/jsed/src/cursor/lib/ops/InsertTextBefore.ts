import type { EditorState } from '../../../editor/index.js';
import type { UserInputOpts } from '../../../input/UserInput.js';
import {
  createToken,
  insertBefore,
  redoInsertAfter,
  redoInsertBefore,
  undoInsertAfter,
  undoInsertBefore,
  type InsertTokenAfter,
  type InsertTokenBefore
} from '../../../lib/ops/token.js';
import type { UndoRecord } from '../../../undo/index.js';
import type { CursorState } from '../CursorState.js';
import { continuesTypingRun, ReplaceWithText } from './ReplaceWithText.js';
import { tokenParts } from '../../../lib/ops/splitter.js';

export class InsertTextBefore implements UndoRecord {
  static run(state: CursorState, text: string, opts?: UserInputOpts) {
    const currentToken = state.getPlace();
    let lastToken: HTMLElement | null = null;
    let insertBefores: InsertTokenBefore[] = [];
    const parts = tokenParts(state.splitter, text);
    for (const [index, part] of parts.entries()) {
      // Each insert lands directly before `currentToken`, so the SEPARATOR it
      // creates is the gap *after* that part — to the next part, or to
      // `currentToken` for the last one.
      const next = parts[index + 1];
      const insertedToken = createToken(part.text);
      const result = insertBefore(insertedToken, currentToken, {
        separator: next ? next.separatorBefore : true
      });
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
    public opts?: UserInputOpts,
    /**
     * TOKEN's that merged replacements inserted after the inserted word.
     */
    public insertTokensAfter: InsertTokenAfter[] = []
  ) {}

  /**
   * Later inserts undo first: see {@link InsertTextAfter.undo}.
   */
  undo(state: EditorState) {
    for (const i of [...this.insertTokensAfter].reverse()) {
      undoInsertAfter(i);
    }
    for (const i of this.insertTokensBefore) {
      undoInsertBefore(i);
    }
    state.cursor?.place(this.cursorTarget.undo, this.opts);
  }

  redo(state: EditorState) {
    for (const i of this.insertTokensBefore) {
      redoInsertBefore(i);
    }
    for (const i of this.insertTokensAfter) {
      redoInsertAfter(i);
    }
    state.cursor?.place(this.cursorTarget.redo, this.opts);
  }

  /**
   * Collapse typing into the inserted word into this record: see
   * {@link InsertTextAfter.merge}.
   */
  merge(next: UndoRecord): UndoRecord | void {
    if (!(next instanceof ReplaceWithText)) return;
    if (!continuesTypingRun([...this.insertTokensBefore, ...this.insertTokensAfter], next)) {
      return;
    }
    this.insertTokensAfter.push(...next.insertTokensAfter);
    this.cursorTarget.redo = next.cursorTarget.redo;
    return this;
  }
}
