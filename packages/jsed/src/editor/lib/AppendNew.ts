import type { EditorState } from './EditorState.js';
import * as focusable from '../../lib/ops/focusable.js';
import { normalize } from '../../lib/ops/normalize.js';
import type { UndoRecord } from '../../undo/index.js';

/**
 * Editor-level FOCUS operation: append a new FOCUSABLE inside the focused one.
 *
 * Mirrors the CURSOR's `DeleteAtCursor` pattern — `run` performs the mutation,
 * emits the element change, moves FOCUS, and returns a {@link UndoRecord} that
 * replays the tripartite low-level op ({@link focusable.appendNew} /
 * {@link focusable.undoAppendElement} / {@link focusable.redoAppendElement}).
 */
export class AppendNew implements UndoRecord {
  static run(state: EditorState, tagName: string): AppendNew | undefined {
    if (state.isEditing()) return;
    const focus = state.nav.getFocus();
    if (!focus) return;

    const op = focusable.appendNew(focus, tagName);
    if (!op) return;

    state.eventsEmitter.emitElementChange({
      type: 'focusable-inserted',
      element: op.element
    });
    state.nav.FOCUS(op.element);

    const record = new AppendNew(op, { undo: focus, redo: op.element });
    record.normalize();
    return record;
  }

  constructor(
    private op: focusable.AppendElement,
    private focusTarget: { undo: HTMLElement; redo: HTMLElement }
  ) {}

  /**
   * Re-assert derived structure in the region this op touched. `op.parent`
   * stays put across do/undo/redo, so it is the stable affected container.
   * `normalize` is idempotent, so this is safe after every replay.
   */
  private normalize() {
    normalize(this.op.parent);
  }

  undo(state: EditorState) {
    focusable.undoAppendElement(this.op);
    state.nav.FOCUS(this.focusTarget.undo);
    this.normalize();
  }

  redo(state: EditorState) {
    focusable.redoAppendElement(this.op);
    state.nav.FOCUS(this.focusTarget.redo);
    this.normalize();
  }
}
