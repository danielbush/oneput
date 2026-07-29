import type { EditorState } from '../editor/lib/EditorState.js';

/**
 * Run several editor operations as one atomic undo/redo change.
 *
 * A false result or thrown error rolls captured operations back immediately
 * and leaves the existing undo/redo history unchanged.
 */
export function transaction(state: EditorState, run: () => boolean): boolean {
  state.undo.beginGroup();
  try {
    const succeeded = run();
    if (succeeded) {
      state.undo.commitGroup();
      return true;
    }
    rollbackTransaction(state);
    return false;
  } catch (error) {
    rollbackTransaction(state);
    throw error;
  }
}

/**
 * Roll an active transaction back in reverse operation order.
 */
function rollbackTransaction(state: EditorState): void {
  const records = state.undo.cancelGroup();
  for (let index = records.length - 1; index >= 0; index -= 1) {
    records[index]?.undo(state);
  }
}
