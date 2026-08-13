import type { UserInputOpts } from '../../../input/UserInput.js';
import type { CursorState } from '../CursorState.js';
import type { EditorState } from '../../../editor/index.js';
import type { UndoRecord } from '../../../undo/UndoRecorder.js';
import { DeleteAtCursor } from './DeleteAtCursor.js';
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
} from '../../../lib/ops/token.js';
import { ReplaceSelectionWithText } from './ReplaceSelectionWithText.js';
import { tokenParts } from '../../../lib/ops/splitter.js';

export class ReplaceWithText implements UndoRecord {
  static run(state: CursorState, text: string, opts?: UserInputOpts) {
    if (state.selection) {
      return ReplaceSelectionWithText.run(state, text, opts);
    }

    if (!state.isOnToken()) return;
    const currentToken = state.getPlace();
    const [firstPart, ...parts] = tokenParts(state.splitter, text);
    if (!firstPart) return;
    const firstWord = replaceText(currentToken, firstPart.text);
    let lastToken: HTMLElement = currentToken;
    let insertAfters: InsertTokenAfter[] = [];
    // `firstPart` took over `currentToken`, so every remaining part's
    // `separatorBefore` describes a gap between two parts of this same text.
    for (const part of parts.reverse()) {
      const insertedToken = createToken(part.text);
      const result = insertAfter(insertedToken, currentToken, {
        separator: part.separatorBefore
      });
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

  /**
   * Collapse an uninterrupted typing burst into one undo step.
   *
   * A burst is not confined to one TOKEN. SYNTACTIC_SPLIT means typing
   * `foo-bar` produces three TOKEN's without the user ever pausing, so the
   * burst continues into TOKEN's this record created. Both cases below carry
   * `next.insertTokensAfter` across — dropping them would leave a TOKEN in the
   * document that no record can undo.
   *
   * If a finer granularity is wanted later (say, ending the burst at a
   * punctuation boundary), that is a condition here rather than a redesign.
   */
  merge(next: UndoRecord): UndoRecord | void {
    if (next instanceof ReplaceWithText) {
      // The user is still typing into the TOKEN this record rewrote.
      // this.replaceText.before - the earliest state of the token
      // next.replaceText.after - the latest state of the token
      if (this.replaceText.token === next.replaceText.token) {
        this.replaceText.after = next.replaceText.after;
        this.insertTokensAfter.push(...next.insertTokensAfter);
        return this;
      }
      // The user is typing into a TOKEN this record created, with no SEPARATOR
      // between them — the SYNTACTIC_SPLIT case, where the CURSOR moved on to
      // the part just split off. To the user that is still one word, so it is
      // still one burst. A SEPARATOR means they typed a space, which is a
      // deliberate word boundary and ends the burst.
      //
      // `next.replaceText` is not worth keeping: undo removes that TOKEN
      // outright, and redo re-attaches the same node with its final text.
      const continuesIntoSplitPart = this.insertTokensAfter.some(
        (insert) => insert.token === next.replaceText.token && insert.separatorAfter === null
      );
      if (continuesIntoSplitPart) {
        this.insertTokensAfter.push(...next.insertTokensAfter);
        return this;
      }
      return;
    }

    if (this.insertTokensAfter.length > 0) {
      // Collapsing into a DeleteAtCursor drops this record, which would strand
      // the TOKEN's it inserted.
      return;
    }
    // Collapse last ReplaceWithText to DeleteAtCursor
    if (next instanceof DeleteAtCursor) {
      if (
        next.removeToken &&
        next.removeToken.token === this.replaceText.token &&
        next.removeToken.token.firstChild
      ) {
        next.removeToken.token.firstChild.nodeValue = this.replaceText.before;
        return next;
      }
    }
    return;
  }
}
