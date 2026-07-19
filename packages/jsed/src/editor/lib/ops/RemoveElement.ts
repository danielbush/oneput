import type { EditorState } from '../EditorState.js';
import * as focusable from '../../../lib/ops/focusable.js';
import { normalize } from '../../../lib/ops/normalize.js';
import type { UndoRecord } from '../../../undo/index.js';

/**
 * Editor-level operation: remove an existing element (undoable).
 *
 * Used when protocol recipes clean up empty hosts (e.g. nested task-list after
 * promote). Undo restores the element at its prior parent/index.
 */
export class RemoveElement implements UndoRecord {
  static run(state: EditorState, element: HTMLElement): RemoveElement | undefined {
    if (state.isEditing()) return;
    if (!element.parentElement) return;

    const focus = state.nav.getFocus();
    const op = focusable.removeElement(element);
    if (!op) return;

    const undoFocus =
      focus && !element.contains(focus) && focus.isConnected ? focus : op.fromParent;
    if (focus && element.contains(focus)) {
      state.nav.FOCUS(focusable.getInitialFocusTarget(op.fromParent));
    }

    state.eventsEmitter.emitElementChange({
      type: 'focusable-removed',
      element: op.element
    });

    const record = new RemoveElement(op, {
      undo: undoFocus,
      redo: state.nav.getFocus() ?? op.fromParent
    });
    record.normalize();
    return record;
  }

  constructor(
    private op: focusable.RemoveElement,
    private focusTarget: { undo: HTMLElement; redo: HTMLElement }
  ) {}

  private normalize() {
    if (this.op.fromParent.isConnected) {
      normalize(this.op.fromParent);
    }
  }

  undo(state: EditorState) {
    focusable.undoRemoveElement(this.op);
    state.nav.FOCUS(this.focusTarget.undo);
    this.normalize();
  }

  redo(state: EditorState) {
    focusable.redoRemoveElement(this.op);
    const redoFocus = this.focusTarget.redo.isConnected
      ? this.focusTarget.redo
      : this.op.fromParent;
    state.nav.FOCUS(redoFocus);
    this.normalize();
  }
}
