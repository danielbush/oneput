import type { EditorState } from '../EditorState.js';
import * as insert from '../../../lib/ops/focusable/insert.js';
import { normalize } from '../../../lib/ops/normalize.js';
import type { UndoRecord } from '../../../undo/index.js';

/**
 * Editor-level operation: insert an existing element after an anchor.
 *
 * It keeps the current FOCUS: the caller decides whether to move FOCUS to the
 * new element (for example, a protocol recipe with a `focus-role` step). Undo
 * moves FOCUS back only when FOCUS was inside the removed element.
 *
 * `after` defaults to the current FOCUS. Pass an explicit anchor when the
 * insert host is not the FOCUSABLE leaf (e.g. insert a task-item after a
 * focus-off `[data-task]` while FOCUS is on its title).
 */
export class InsertElementAfter implements UndoRecord {
  static run(
    state: EditorState,
    element: HTMLElement,
    after?: HTMLElement
  ): InsertElementAfter | undefined {
    if (state.isEditing()) return;
    const focus = state.nav.getFocus();
    const target = after ?? focus;
    if (!target || target === state.document.root) return;

    const op = insert.insertElementAfter(element, target);
    state.eventsEmitter.emitElementChange({
      type: 'focusable-inserted',
      element: op.element
    });

    const record = new InsertElementAfter(op, focus ?? undefined);
    record.normalize();
    return record;
  }

  constructor(
    private op: insert.InsertElementAfter,
    private priorFocus: HTMLElement | undefined
  ) {}

  /**
   * Re-assert derived structure in the region this op touched.
   *
   * `op.target` stays put across do/undo/redo, so its parent is the stable
   * affected container. `normalize` is idempotent.
   */
  private normalize() {
    if (this.op.target.parentElement) {
      normalize(this.op.target.parentElement);
    }
  }

  undo(state: EditorState) {
    insert.undoInsertElementAfter(this.op);
    state.nav.repairFocus(this.priorFocus ?? this.op.marker);
    this.normalize();
  }

  redo(_state: EditorState) {
    insert.redoInsertElementAfter(this.op);
    this.normalize();
  }
}
