import type { EditorState } from '../EditorState.js';
import * as focusable from '../../../lib/ops/focusable.js';
import { normalize } from '../../../lib/ops/normalize.js';
import type { UndoRecord } from '../../../undo/index.js';

/**
 * Editor-level FOCUS operation: insert an existing element after the focused one.
 *
 * Same lifecycle as {@link InsertAfter} (emit, FOCUS, normalize, undo/redo), but
 * the caller supplies the element instead of an {@link ElementSpec}.
 */
export class InsertElementAfter implements UndoRecord {
  static run(state: EditorState, element: HTMLElement): InsertElementAfter | undefined {
    if (state.isEditing()) return;
    const focus = state.nav.getFocus();
    if (!focus || focus === state.document.root) return;

    const op = focusable.insertElementAfter(element, focus);
    const focusTarget = focusable.getInitialFocusTarget(op.element);
    state.eventsEmitter.emitElementChange({
      type: 'focusable-inserted',
      element: op.element
    });
    state.nav.FOCUS(focusTarget);

    const record = new InsertElementAfter(op, { undo: focus, redo: focusTarget });
    record.normalize();
    return record;
  }

  constructor(
    private op: focusable.InsertElementAfter,
    private focusTarget: { undo: HTMLElement; redo: HTMLElement }
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
    focusable.undoInsertElementAfter(this.op);
    state.nav.FOCUS(this.focusTarget.undo);
    this.normalize();
  }

  redo(state: EditorState) {
    focusable.redoInsertElementAfter(this.op);
    state.nav.FOCUS(this.focusTarget.redo);
    this.normalize();
  }
}
