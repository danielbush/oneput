import type { EditorState } from '../../editor/index.js';
import type { UserInputOpts } from '../input/UserInput';
import {
  createToken,
  insertBefore,
  redoInsertBefore,
  undoInsertBefore,
  type InsertTokenBefore
} from '../ops/token';
import type { UndoRecord } from '../undo';
import type { CursorState } from './CursorState';
import { DeleteSelection } from './DeleteSelection';
import { ReplaceWithText } from './ReplaceWithText';

export class ReplaceSelectionWithText implements UndoRecord {
  static run(state: CursorState, text: string, opts?: UserInputOpts) {
    if (!state.isOnToken()) return;
    if (!state.selection) {
      return;
    }

    // Favour inserting text before the front.
    const front = state.selection.getFront();
    const frontWrapper = state.selection.getFrontWrapper();
    let lastToken: HTMLElement | null = null;
    let insertBefores: InsertTokenBefore[] = [];
    const parts = text.split(/\s+/).filter(Boolean);
    for (const part of parts) {
      const insertedToken = createToken(part);
      const result = insertBefore(insertedToken, frontWrapper);
      insertBefores.push(result);
      lastToken = insertedToken;
    }
    if (!lastToken) {
      return;
    }
    const deleteSelection = DeleteSelection.run(state.selection, state);
    if (parts.length === 1) {
      state.place(lastToken, { inputCursorPosition: 'end' });
    } else {
      state.place(lastToken, opts);
    }
    return new ReplaceSelectionWithText(
      {
        undo: front,
        redo: lastToken
      },
      insertBefores,
      deleteSelection
    );
  }

  constructor(
    public cursorTarget: {
      undo: HTMLElement;
      redo: HTMLElement;
    },
    public insertBefores: InsertTokenBefore[],
    public deleteSelection: DeleteSelection
  ) {}

  undo(state: EditorState) {
    for (const i of this.insertBefores) {
      undoInsertBefore(i);
    }
    this.deleteSelection.undo(state);
    state.cursor?.place(this.cursorTarget.undo);
  }

  redo(state: EditorState) {
    for (const i of this.insertBefores) {
      redoInsertBefore(i);
    }
    this.deleteSelection.redo(state);
    state.cursor?.place(this.cursorTarget.redo);
  }

  merge(next: UndoRecord): UndoRecord | void {
    if (this.insertBefores.length !== 1) {
      return;
    }
    const token = this.insertBefores[0].token;
    if (next instanceof ReplaceWithText && next.replaceText.token === token) {
      token.firstChild!.nodeValue = next.replaceText.after;
      return this;
    }
  }
}
