import type { EditorState } from '../EditorState.js';
import * as insert from '../../../lib/ops/focusable/insert.js';
import { getInitialFocusTarget } from '../../../lib/ops/focusable/create.js';
import { normalize } from '../../../lib/ops/normalize.js';
import type { ElementSpec } from '../../../lib/core/dom-rules.js';
import type { UndoRecord } from '../../../undo/index.js';

/**
 * Editor-level FOCUS operation: append a new FOCUSABLE inside the focused one.
 *
 * Mirrors the CURSOR's `DeleteAtCursor` pattern — `run` performs the mutation,
 * emits the element change, moves FOCUS, and returns a {@link UndoRecord} that
 * replays the tripartite low-level op ({@link insert.appendNew} /
 * {@link insert.undoAppendElement} / {@link insert.redoAppendElement}).
 */
export class AppendNew implements UndoRecord {
  static run(state: EditorState, spec: ElementSpec): AppendNew | undefined {
    if (state.isEditing()) return;
    const focus = state.nav.getFocus();
    if (!focus) return;

    const op = insert.appendNew(focus, spec);
    if (!op) return;

    const focusTarget = getInitialFocusTarget(op.element);
    state.eventsEmitter.emitElementChange({
      type: 'focusable-inserted',
      element: op.element
    });
    state.nav.FOCUS(focusTarget);

    const record = new AppendNew(op, { undo: focus, redo: focusTarget });
    record.normalize();
    return record;
  }

  constructor(
    private op: insert.AppendElement,
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
    insert.undoAppendElement(this.op);
    state.nav.FOCUS(this.focusTarget.undo);
    this.normalize();
  }

  redo(state: EditorState) {
    insert.redoAppendElement(this.op);
    state.nav.FOCUS(this.focusTarget.redo);
    this.normalize();
  }
}
