import type { EditorState } from '../../../editor/index.js';
import { getNextNodeSibling, getPreviousNodeSibling } from '../../../lib/core/sibling.js';
import {
  getSeparatorAfter,
  getSeparatorBefore,
  insertSeparatorAfter,
  insertSeparatorBefore,
  redoInsertSeparator,
  undoInsertSeparator,
  type InsertedSeparator
} from '../../../lib/ops/space.js';
import type { UndoRecord } from '../../../undo/index.js';
import type { CursorState } from '../CursorState.js';

/**
 * Keep the space that started an insert when the user moves on past it
 * without typing a word: "abc.def", on `.`, then space and moveNext, gives
 * "abc. def".
 *
 * Moving on past the space keeps it: moveNext from CURSOR_INSERT_AFTER, or
 * movePrevious from CURSOR_INSERT_BEFORE. Moving the other way cancels the
 * insert, and nothing changes. Where a SEPARATOR is there already, or
 * nothing follows (or precedes) the TOKEN, there is nothing to keep.
 */
export class KeepInsertSpace implements UndoRecord {
  static run(state: CursorState, direction: 'forward' | 'backward'): KeepInsertSpace | undefined {
    const token = state.getPlace();
    let inserted: InsertedSeparator;
    if (direction === 'forward' && state.isInsertingAfter()) {
      if (getSeparatorAfter(token) || !getNextNodeSibling(token)) return;
      inserted = insertSeparatorAfter(token);
    } else if (direction === 'backward' && state.isInsertingBefore()) {
      if (getSeparatorBefore(token) || !getPreviousNodeSibling(token)) return;
      inserted = insertSeparatorBefore(token);
    } else {
      return;
    }
    state.eventsEmitter.emitTextChange({ type: 'separator-change', token, change: 'inserted' });
    return new KeepInsertSpace(token, inserted);
  }

  constructor(
    public token: HTMLElement,
    public separator: InsertedSeparator
  ) {}

  undo(state: EditorState) {
    undoInsertSeparator(this.separator);
    state.cursor?.place(this.token);
  }

  redo(state: EditorState) {
    redoInsertSeparator(this.separator);
    state.cursor?.place(this.token);
  }
}
