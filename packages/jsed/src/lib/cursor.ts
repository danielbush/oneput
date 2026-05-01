import type { CursorState } from '../Cursor.js';
import type { UserInputSelectionState } from '../UserInput.js';

export function getCursorStateFromInput(input: string): CursorState {
  if (input.endsWith(' ')) {
    return 'CURSOR_INSERT_AFTER';
  }

  if (input.startsWith(' ')) {
    return 'CURSOR_INSERT_BEFORE';
  }

  return 'CURSOR_OVERWRITE';
}

export function getCursorStateFromSelection(selection: UserInputSelectionState): CursorState {
  switch (selection) {
    case 'CURSOR_AT_BEGINNING':
      return 'CURSOR_PREPEND';
    case 'CURSOR_AT_END':
      return 'CURSOR_APPEND';
    default:
      return 'CURSOR_OVERWRITE';
  }
}
