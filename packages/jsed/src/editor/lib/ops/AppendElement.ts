import type { EditorState } from '../EditorState.js';
import * as insert from '../../../lib/ops/focusable/insert.js';
import { normalize } from '../../../lib/ops/normalize.js';
import type { UndoRecord } from '../../../undo/index.js';
import { refocusIfDisconnected } from './keepFocus.js';

/**
 * Editor-level operation: append an existing element inside a parent.
 *
 * It keeps the current FOCUS: the caller decides whether to move FOCUS to the
 * new element (for example, a protocol recipe with a `focus-role` step). Undo
 * moves FOCUS back only when FOCUS was inside the removed element.
 *
 * `parent` defaults to the current FOCUS. Pass an explicit parent when the
 * append host is not FOCUSABLE (e.g. `data-jsed-focus="off"`).
 */
export class AppendElement implements UndoRecord {
  static run(
    state: EditorState,
    element: HTMLElement,
    parent?: HTMLElement
  ): AppendElement | undefined {
    if (state.isEditing()) return;
    const focus = state.nav.getFocus();
    const appendParent = parent ?? focus;
    if (!appendParent) return;

    const op = insert.appendElement(element, appendParent);
    state.eventsEmitter.emitElementChange({
      type: 'focusable-inserted',
      element: op.element
    });

    const record = new AppendElement(op, focus ?? undefined);
    record.normalize();
    return record;
  }

  constructor(
    private op: insert.AppendElement,
    private priorFocus: HTMLElement | undefined
  ) {}

  /**
   * Re-assert derived structure on the append parent.
   *
   * `op.parent` stays put across do/undo/redo. `normalize` is idempotent.
   */
  private normalize() {
    normalize(this.op.parent);
  }

  undo(state: EditorState) {
    insert.undoAppendElement(this.op);
    refocusIfDisconnected(state, this.priorFocus, this.op.parent);
    this.normalize();
  }

  redo(_state: EditorState) {
    insert.redoAppendElement(this.op);
    this.normalize();
  }
}
