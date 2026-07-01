import type { EditorState } from '../EditorState.js';
import * as focusable from '../../../lib/ops/focusable.js';
import { canDelete } from '../../../lib/core/dom-rules.js';
import type { UndoRecord } from '../../../undo/index.js';

/**
 * Editor-level FOCUS operation: delete the focused FOCUSABLE.
 *
 * Mirrors the CURSOR's `DeleteAtCursor` pattern — `run` performs the mutation,
 * emits the element change, moves FOCUS, and returns a {@link UndoRecord} that
 * replays the tripartite low-level op ({@link focusable.deleteElement} /
 * {@link focusable.undoDeleteElement} / {@link focusable.redoDeleteElement}).
 *
 * Unlike the insert records, `Delete` does not `normalize`: removing a
 * FOCUSABLE can empty its parent, and a re-anchorizing pass would then leave a
 * stray ANCHOR that `undoDeleteElement` doesn't clean up when it restores the
 * element. This matches the pre-conversion behaviour, which never anchorized on
 * delete. See architecture.md's note on asymmetric ANCHOR normalization.
 */
export class Delete implements UndoRecord {
  static run(state: EditorState): Delete | undefined {
    if (state.isEditing()) return;
    const focus = state.nav.getFocus();
    if (!focus || !canDelete(focus, state.document)) return;

    const parent = focus.parentElement;
    if (!parent) return;

    const nextFocus =
      focusable.findNextFocusableOutside(focus, state.document.root) ??
      focusable.findPreviousFocusableOutside(focus, state.document.root) ??
      parent;

    const op = focusable.deleteElement(focus);
    state.eventsEmitter.emitElementChange({
      type: 'focusable-removed',
      element: focus
    });
    state.nav.FOCUS(nextFocus);

    return new Delete(op, { undo: focus, redo: nextFocus });
  }

  constructor(
    private op: focusable.DeleteElement,
    private focusTarget: { undo: HTMLElement; redo: HTMLElement }
  ) {}

  undo(state: EditorState) {
    focusable.undoDeleteElement(this.op);
    state.nav.FOCUS(this.focusTarget.undo);
  }

  redo(state: EditorState) {
    focusable.redoDeleteElement(this.op);
    state.nav.FOCUS(this.focusTarget.redo);
  }
}
