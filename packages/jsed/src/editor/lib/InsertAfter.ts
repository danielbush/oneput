import type { EditorState } from './EditorState.js';
import * as focusable from '../../lib/ops/focusable.js';
import type { UndoRecord } from '../../undo/index.js';

/**
 * Editor-level FOCUS operation: insert a new FOCUSABLE after the focused one.
 *
 * Mirrors the CURSOR's `DeleteAtCursor` pattern — `run` performs the mutation,
 * emits the element change, moves FOCUS, and returns a {@link UndoRecord} that
 * replays the tripartite low-level op ({@link focusable.insertNewAfter} /
 * {@link focusable.undoInsertElementAfter} / {@link focusable.redoInsertElementAfter}).
 */
export class InsertAfter implements UndoRecord {
  static run(state: EditorState, tagName: string): InsertAfter | undefined {
    if (state.isEditing()) return;
    const focus = state.nav.getFocus();
    if (!focus || focus === state.document.root) return;

    const op = focusable.insertNewAfter(tagName, focus);
    if (!op) return;

    state.eventsEmitter.emitElementChange({
      type: 'focusable-inserted',
      element: op.element
    });
    state.nav.FOCUS(op.element);

    return new InsertAfter(op, { undo: focus, redo: op.element });
  }

  constructor(
    private op: focusable.InsertElementAfter,
    private focusTarget: { undo: HTMLElement; redo: HTMLElement }
  ) {}

  undo(state: EditorState) {
    focusable.undoInsertElementAfter(this.op);
    state.nav.FOCUS(this.focusTarget.undo);
  }

  redo(state: EditorState) {
    focusable.redoInsertElementAfter(this.op);
    state.nav.FOCUS(this.focusTarget.redo);
  }
}
