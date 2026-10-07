import type { EditorState } from '../EditorState.js';
import { getInitialFocusTarget } from '../../../lib/ops/focusable/create.js';

/**
 * Move FOCUS out of an element that is no longer in the document.
 *
 * Insert and move ops keep the current FOCUS, so only undo or redo can
 * disconnect it. Go to `prior` when it is still in the document; else go to
 * the first FOCUSABLE in `fallback`.
 */
export function refocusIfDisconnected(
  state: EditorState,
  prior: HTMLElement | undefined,
  fallback: HTMLElement
): void {
  const focus = state.nav.getFocus();
  if (focus?.isConnected) return;
  state.nav.FOCUS(prior?.isConnected ? prior : getInitialFocusTarget(fallback));
}
