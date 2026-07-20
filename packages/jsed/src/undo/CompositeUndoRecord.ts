import type { EditorState } from '../editor/index.js';
import type { UndoRecord } from './UndoRecorder.js';

/**
 * Treat several ordered undo records as one user-level change.
 */
export class CompositeUndoRecord implements UndoRecord {
  constructor(public readonly records: readonly UndoRecord[]) {}

  undo(state: EditorState): void {
    for (let index = this.records.length - 1; index >= 0; index -= 1) {
      this.records[index]?.undo(state);
    }
  }

  redo(state: EditorState): void {
    for (const record of this.records) {
      record.redo(state);
    }
  }
}
