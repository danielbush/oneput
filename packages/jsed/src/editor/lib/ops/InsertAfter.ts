import type { EditorState } from '../EditorState.js';
import * as insert from '../../../lib/ops/focusable/insert.js';
import { getInitialFocusTarget } from '../../../lib/ops/focusable/create.js';
import { normalize } from '../../../lib/ops/normalize.js';
import type { ElementSpec } from '../../../lib/core/dom-rules.js';
import type { UndoRecord } from '../../../undo/index.js';

/**
 * Editor-level FOCUS operation: insert a new FOCUSABLE after the focused one.
 *
 * Mirrors the CURSOR's `DeleteAtCursor` pattern — `run` performs the mutation,
 * emits the element change, moves FOCUS, and returns a {@link UndoRecord} that
 * replays the tripartite low-level op ({@link insert.insertNewAfter} /
 * {@link insert.undoInsertElementAfter} / {@link insert.redoInsertElementAfter}).
 */
export class InsertAfter implements UndoRecord {
  static run(state: EditorState, spec: ElementSpec): InsertAfter | undefined {
    if (state.isEditing()) return;
    const focus = state.nav.getFocus();
    if (!focus || focus === state.document.root) return;

    const op = insert.insertNewAfter(spec, focus);
    if (!op) return;

    const focusTarget = getInitialFocusTarget(op.element);
    state.eventsEmitter.emitElementChange({
      type: 'focusable-inserted',
      element: op.element
    });
    state.nav.FOCUS(focusTarget);

    const record = new InsertAfter(op, { undo: focus, redo: focusTarget });
    record.normalize();
    return record;
  }

  constructor(
    private op: insert.InsertElementAfter,
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
    insert.undoInsertElementAfter(this.op);
    state.nav.FOCUS(this.focusTarget.undo);
    this.normalize();
  }

  redo(state: EditorState) {
    insert.redoInsertElementAfter(this.op);
    state.nav.FOCUS(this.focusTarget.redo);
    this.normalize();
  }
}
