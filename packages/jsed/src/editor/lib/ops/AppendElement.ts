import type { EditorState } from '../EditorState.js';
import * as insert from '../../../lib/ops/focusable/insert.js';
import { getInitialFocusTarget } from '../../../lib/ops/focusable/create.js';
import { normalize } from '../../../lib/ops/normalize.js';
import type { UndoRecord } from '../../../undo/index.js';

/**
 * Editor-level FOCUS operation: append an existing element inside a parent.
 *
 * Same lifecycle as {@link AppendNew} (emit, FOCUS, normalize, undo/redo), but
 * the caller supplies the element instead of an {@link ElementSpec}.
 *
 * `parent` defaults to the current FOCUS. Pass an explicit parent when the
 * append host is not FOCUSABLE (e.g. `data-jsed-focus="off"`); undo restores
 * the prior FOCUS rather than that host.
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
    const focusTarget = getInitialFocusTarget(op.element);
    state.eventsEmitter.emitElementChange({
      type: 'focusable-inserted',
      element: op.element
    });
    state.nav.FOCUS(focusTarget);

    const undoFocus = focus ?? focusTarget;
    const record = new AppendElement(op, { undo: undoFocus, redo: focusTarget });
    record.normalize();
    return record;
  }

  constructor(
    private op: insert.AppendElement,
    private focusTarget: { undo: HTMLElement; redo: HTMLElement }
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
    state.nav.FOCUS(this.focusTarget.undo);
    this.normalize();
  }

  redo(state: EditorState) {
    insert.redoAppendElement(this.op);
    state.nav.FOCUS(this.focusTarget.redo);
    this.normalize();
  }
}
