import type { CursorState } from '../Cursor.js';
import type { UserInputSelectionState } from '../UserInput.js';

/**
 * Pure visual derivation for the focused TOKEN, computed from the current
 * input selection state and input value together.
 *
 * - `caret` is true when the input has a collapsed caret in its text
 *   (CURSOR_AT_BEGINNING / _MIDDLE / _END). Drives the underline indicator;
 *   false means bg-pulse.
 * - `marker` is the boundary marker for the four CURSOR_STATE labels.
 *   - AT_BEGINNING + leading space  → CURSOR_INSERT_BEFORE
 *   - AT_BEGINNING, no leading space → CURSOR_PREPEND
 *   - AT_END + trailing space        → CURSOR_INSERT_AFTER
 *   - AT_END, no trailing space      → CURSOR_APPEND
 *   - anything else                  → null (clear markers)
 *
 * `selection` may be null when no selection state has been observed yet
 * (e.g. immediately after the cursor was placed on a new TOKEN).
 */
export function deriveCursorVisuals(
  selection: UserInputSelectionState | null,
  value: string
): { caret: boolean; marker: CursorState | null } {
  const caret =
    selection === 'CURSOR_AT_BEGINNING' ||
    selection === 'CURSOR_AT_MIDDLE' ||
    selection === 'CURSOR_AT_END';

  let marker: CursorState | null = null;
  if (selection === 'CURSOR_AT_BEGINNING') {
    marker = value.startsWith(' ') ? 'CURSOR_INSERT_BEFORE' : 'CURSOR_PREPEND';
  } else if (selection === 'CURSOR_AT_END') {
    marker = value.endsWith(' ') ? 'CURSOR_INSERT_AFTER' : 'CURSOR_APPEND';
  }

  return { caret, marker };
}
