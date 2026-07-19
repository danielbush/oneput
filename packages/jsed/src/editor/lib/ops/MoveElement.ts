import type { EditorState } from '../EditorState.js';
import * as focusable from '../../../lib/ops/focusable.js';
import { normalize } from '../../../lib/ops/normalize.js';
import type { UndoRecord } from '../../../undo/index.js';

/**
 * Editor-level operation: move an existing element to a new location.
 *
 * Undo restores the prior parent/index and FOCUS. Used by protocol recipes
 * (reorder / promote / demote) rather than freeform HTML editing.
 */
export class MoveElement implements UndoRecord {
  static run(
    state: EditorState,
    element: HTMLElement,
    placement: focusable.MovePlacement
  ): MoveElement | undefined {
    if (state.isEditing()) return;

    const focus = state.nav.getFocus();
    const op = focusable.moveElement(element, placement);
    if (!op) return;

    const focusTarget = focusable.getInitialFocusTarget(op.element);
    state.eventsEmitter.emitElementChange({
      type: 'focusable-inserted',
      element: op.element
    });
    state.nav.FOCUS(focusTarget);

    const undoFocus = focus && element.contains(focus) ? focusTarget : (focus ?? focusTarget);
    const record = new MoveElement(op, { undo: undoFocus, redo: focusTarget });
    record.normalize();
    return record;
  }

  constructor(
    private op: focusable.MoveElement,
    private focusTarget: { undo: HTMLElement; redo: HTMLElement }
  ) {}

  /**
   * Normalize both the origin and destination containers.
   */
  private normalize() {
    if (this.op.fromParent.isConnected) {
      normalize(this.op.fromParent);
    }
    const destParent =
      this.op.placement.type === 'append'
        ? this.op.placement.parent
        : this.op.placement.ref.parentElement;
    if (destParent?.isConnected) {
      normalize(destParent);
    }
  }

  undo(state: EditorState) {
    focusable.undoMoveElement(this.op);
    state.nav.FOCUS(this.focusTarget.undo);
    this.normalize();
  }

  redo(state: EditorState) {
    focusable.redoMoveElement(this.op);
    state.nav.FOCUS(this.focusTarget.redo);
    this.normalize();
  }
}
