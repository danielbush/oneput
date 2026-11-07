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
import {
  getSeparatorBefore,
  insertSeparatorBefore,
  redoInsertSeparator,
  undoInsertSeparator,
  type InsertedSeparator
} from '../../../lib/ops/space.js';
import { getPreviousNodeSibling } from '../../../lib/core/sibling.js';
import type { UndoRecord } from '../../../undo/index.js';
import type { CursorState } from '../CursorState.js';
import { continuesTypingRun, ReplaceWithText } from './ReplaceWithText.js';
import { tokenParts } from '../../../lib/ops/splitter.js';

export class InsertTextBefore implements UndoRecord {
  static run(state: CursorState, text: string, opts?: UserInputOpts) {
    const currentToken = state.getPlace();
    // See InsertTextAfter: "abc.def", on `def`, would give "abc.X def".
    const joinsPrevious =
      !getSeparatorBefore(currentToken) && !!getPreviousNodeSibling(currentToken);
    let firstToken: HTMLElement | null = null;
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
      firstToken ??= insertedToken;
      lastToken = insertedToken;
    }
    if (!lastToken || !firstToken) {
      return;
    }
    const separatorBeforeFirst = joinsPrevious ? insertSeparatorBefore(firstToken) : undefined;
    state.place(lastToken, opts);
    return new InsertTextBefore(
      {
        undo: currentToken,
        redo: lastToken
      },
      insertBefores,
      opts,
      [],
      separatorBeforeFirst
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
    public insertTokensAfter: InsertTokenAfter[] = [],
    /**
     * The SEPARATOR between what precedes and the inserted word, when run
     * made one: see `joinsPrevious`.
     */
    public separatorBeforeFirst?: InsertedSeparator
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
    undoInsertSeparator(this.separatorBeforeFirst);
    state.cursor?.place(this.cursorTarget.undo, this.opts);
  }

  redo(state: EditorState) {
    redoInsertSeparator(this.separatorBeforeFirst);
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
