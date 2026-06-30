import type { EditorState } from './EditorState.js';
import * as focusable from '../../lib/ops/focusable.js';
import { normalize } from '../../lib/ops/normalize.js';
import type { UndoRecord } from '../../undo/index.js';

/**
 * Editor-level FOCUS operation: insert a new FOCUSABLE before the focused one.
 *
 * Mirrors the CURSOR's `DeleteAtCursor` pattern — `run` performs the mutation,
 * emits the element change, moves FOCUS, and returns a {@link UndoRecord} that
 * replays the tripartite low-level op ({@link focusable.insertNewBefore} /
 * {@link focusable.undoInsertElementBefore} / {@link focusable.redoInsertElementBefore}).
 */
export class InsertBefore implements UndoRecord {
  static run(state: EditorState, tagName: string): InsertBefore | undefined {
    if (state.isEditing()) return;
    const focus = state.nav.getFocus();
    if (!focus || focus === state.document.root) return;

    const op = focusable.insertNewBefore(tagName, focus);
    if (!op) return;

    state.eventsEmitter.emitElementChange({
      type: 'focusable-inserted',
      element: op.element
    });
    state.nav.FOCUS(op.element);

    const record = new InsertBefore(op, { undo: focus, redo: op.element });
    record.normalize();
    return record;
  }

  constructor(
    private op: focusable.InsertElementBefore,
    private focusTarget: { undo: HTMLElement; redo: HTMLElement }
  ) {}

  /**
   * Re-assert derived structure in the region this op touched. `op.target`
   * stays put across do/undo/redo, so its parent is the stable affected
   * container. `normalize` is idempotent, so this is safe after every replay.
   */
  private normalize() {
    if (this.op.target.parentElement) {
      normalize(this.op.target.parentElement);
    }
  }

  undo(state: EditorState) {
    focusable.undoInsertElementBefore(this.op);
    state.nav.FOCUS(this.focusTarget.undo);
    this.normalize();
  }

  redo(state: EditorState) {
    focusable.redoInsertElementBefore(this.op);
    state.nav.FOCUS(this.focusTarget.redo);
    this.normalize();
  }
}
