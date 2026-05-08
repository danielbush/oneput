import type { CursorState } from '../Cursor.js';
import type { UserInputSelectionState } from '../UserInput.js';

/**
 * Pure derivation of the CURSOR_STATE marker from the input value alone.
 * Returns `null` for any input that doesn't have a boundary space — the
 * caller should clear markers in that case.
 */
export function getCursorStateFromInput(input: string): CursorState | null {
  if (input.endsWith(' ')) {
    return 'CURSOR_INSERT_AFTER';
  }

  if (input.startsWith(' ')) {
    return 'CURSOR_INSERT_BEFORE';
  }

  return null;
}

/**
 * Pure derivation of the CURSOR_STATE marker from the input selection alone.
 * Returns `null` for any selection that isn't a caret at a boundary — the
 * caller should clear markers in that case.
 */
export function getCursorStateFromSelection(
  selection: UserInputSelectionState
): CursorState | null {
  switch (selection) {
    case 'CURSOR_AT_BEGINNING':
      return 'CURSOR_PREPEND';
    case 'CURSOR_AT_END':
      return 'CURSOR_APPEND';
    default:
      return null;
  }
}
