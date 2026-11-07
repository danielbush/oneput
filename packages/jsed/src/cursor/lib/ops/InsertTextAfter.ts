import type { EditorState } from '../../../editor/index.js';
import type { UserInputOpts } from '../../../input/UserInput.js';
import {
  createToken,
  insertAfter,
  redoInsertAfter,
  undoInsertAfter,
  type InsertTokenAfter
} from '../../../lib/ops/token.js';
import {
  ensureSeparatorAfter,
  getSeparatorAfter,
  redoInsertSeparator,
  undoInsertSeparator,
  type InsertedSeparator
} from '../../../lib/ops/space.js';
import { getNextNodeSibling } from '../../../lib/core/sibling.js';
import type { UndoRecord } from '../../../undo/index.js';
import type { CursorState } from '../CursorState.js';
import { continuesTypingRun, ReplaceWithText } from './ReplaceWithText.js';
import { tokenParts } from '../../../lib/ops/splitter.js';

/**
 * Insert string vals after cursor and put cursor on last one.
 */
export class InsertTextAfter implements UndoRecord {
  static run(state: CursorState, text: string, opts?: UserInputOpts) {
    const currentToken = state.getPlace();
    // A SYNTACTIC_SPLIT boundary ("abc.def", on `.`): the new word also needs
    // a SEPARATOR before what follows, or it joins it ("abc. Xdef").
    const joinsNext = !getSeparatorAfter(currentToken) && !!getNextNodeSibling(currentToken);
    let lastToken: HTMLElement | null = null;
    let insertAfters: InsertTokenAfter[] = [];
    const parts = tokenParts(state.splitter, text);
    for (const [index, part] of [...parts].reverse().entries()) {
      // Each insert lands directly after `currentToken`, so the SEPARATOR it
      // creates is the gap *before* that part. The first part's gap is to
      // `currentToken` itself, which the CURSOR_INSERT_AFTER state has already
      // decided is a space.
      const isFirstPart = index === parts.length - 1;
      const insertedToken = createToken(part.text);
      const result = insertAfter(insertedToken, currentToken, {
        separator: isFirstPart || part.separatorBefore
      });
      insertAfters.push(result);
      if (!lastToken) {
        lastToken = insertedToken;
      }
    }
    if (!lastToken) {
      return;
    }
    const separatorAfterLast = joinsNext ? ensureSeparatorAfter(lastToken) : null;
    state.place(lastToken, opts);
    return new InsertTextAfter(
      {
        undo: currentToken,
        redo: lastToken
      },
      insertAfters,
      opts,
      separatorAfterLast ? { separator: separatorAfterLast.separator } : undefined
    );
  }

  constructor(
    public cursorTarget: {
      undo: HTMLElement;
      redo: HTMLElement;
    },
    public insertTokensAfter: InsertTokenAfter[],
    public opts?: UserInputOpts,
    /**
     * The SEPARATOR between the inserted word and what follows, when run
     * made one: see `joinsNext`.
     */
    public separatorAfterLast?: InsertedSeparator
  ) {}

  /**
   * Later inserts undo first: a TOKEN a merged replacement split off sits
   * after the TOKEN this record inserted.
   */
  undo(state: EditorState) {
    for (const i of [...this.insertTokensAfter].reverse()) {
      undoInsertAfter(i);
    }
    undoInsertSeparator(this.separatorAfterLast);
    state.cursor?.place(this.cursorTarget.undo, this.opts);
  }

  redo(state: EditorState) {
    redoInsertSeparator(this.separatorAfterLast);
    for (const i of this.insertTokensAfter) {
      redoInsertAfter(i);
    }
    state.cursor?.place(this.cursorTarget.redo, this.opts);
  }

  /**
   * Collapse typing into the inserted word into this record.
   *
   * See {@link continuesTypingRun}. The merged replacement's own
   * `replaceText` is not kept: undo removes its TOKEN outright, and redo
   * re-attaches the same node with its final text. Its inserts are kept, or
   * undo would leave them in the document.
   */
  merge(next: UndoRecord): UndoRecord | void {
    if (!(next instanceof ReplaceWithText)) return;
    if (!continuesTypingRun(this.insertTokensAfter, next)) return;
    this.insertTokensAfter.push(...next.insertTokensAfter);
    this.cursorTarget.redo = next.cursorTarget.redo;
    return this;
  }
}
