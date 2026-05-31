import * as token from '../ops/token.js';
import type { UserInputOpts } from '../input/UserInput';
import type { CursorState } from './CursorState';
import type { InsertTokenAfter, ReplaceText } from '../undo/UndoOperation.js';
import type { EditorState } from '../editor/EditorState.js';

export class ReplaceWithText {
  static run(state: CursorState, text: string, opts?: UserInputOpts) {
    if (!state.isOnToken()) return;
    const currentToken = state.getPlace();
    const [firstPart, ...parts] = text.split(/\s+/).filter(Boolean);
    if (!firstPart) return;

    // const undo: UndoRecord = { ops: [] };
    const firstWord = token.replaceText(currentToken, firstPart);

    // Undo ops get played in reverse.
    // Some of the ops that will be pushed below may also place the cursor.
    // undo.ops.push({ action: 'place-cursor', target: currentToken });
    // undo.ops.push(result);

    let lastToken: HTMLElement = currentToken;
    let insertAfters: InsertTokenAfter[] = [];
    for (const part of parts.reverse()) {
      const insertedToken = token.createToken(part);
      const result = token.insertAfter(insertedToken, currentToken);
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
    token.undoReplaceText(this.replaceText);
    state.cursor?.place(this.cursorTarget.undo, this.opts);
  }

  redo(state: EditorState) {
    token.redoReplaceText(this.replaceText);
    state.cursor?.place(this.cursorTarget.redo, this.opts);
  }
}
