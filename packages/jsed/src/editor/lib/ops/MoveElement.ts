import type { EditorState } from '../EditorState.js';
import * as move from '../../../lib/ops/focusable/move.js';
import { normalize } from '../../../lib/ops/normalize.js';
import type { UndoRecord } from '../../../undo/index.js';

/**
 * Editor-level operation: move an existing element to a new location.
 *
 * Undo restores the prior parent/index. It keeps the current FOCUS: a moved
 * element stays in the document, so FOCUS inside it stays valid. Used by
 * protocol recipes (reorder / promote / demote) rather than freeform HTML
 * editing.
 */
export class MoveElement implements UndoRecord {
  static run(
    state: EditorState,
    element: HTMLElement,
    placement: move.MovePlacement
  ): MoveElement | undefined {
    if (state.isEditing()) return;

    const op = move.moveElement(element, placement);
    if (!op) return;

    state.eventsEmitter.emitElementChange({
      type: 'focusable-inserted',
      element: op.element
    });

    const record = new MoveElement(op);
    record.normalize();
    return record;
  }

  constructor(private op: move.MoveElement) {}

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

  undo(_state: EditorState) {
    move.undoMoveElement(this.op);
    this.normalize();
  }

  redo(_state: EditorState) {
    move.redoMoveElement(this.op);
    this.normalize();
  }
}
