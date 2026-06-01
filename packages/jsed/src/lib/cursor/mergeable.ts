import type { UndoRecord } from '../undo/UndoRecorder.js';
import type { ReplaceWithText } from './ReplaceWithText.js';
import type { DeleteAtCursor } from './DeleteAtCursor.js';

/**
 * Group 1: incremental token text edits that coalesce into a single undo step
 * (typing into / replacing / deleting within one TOKEN). A different mergeable
 * family defines its own union + guard alongside this one; merges never cross
 * groups, so each group stays a small closed set.
 *
 * Type-only imports keep this free of a runtime cycle with the record classes.
 */
export type TextEditRecord = ReplaceWithText | DeleteAtCursor;

export function isTextEdit(record: UndoRecord): record is TextEditRecord {
  return record.action === 'ReplaceWithText' || record.action === 'DeleteAtCursor';
}
