import type { EditorState } from '../EditorState.js';
import * as focusable from '../../../lib/ops/focusable.js';
import { normalize } from '../../../lib/ops/normalize.js';
import type { UndoRecord } from '../../../undo/index.js';

/**
 * Editor-level FOCUS operation: append an existing element inside the focused one.
 *
 * Same lifecycle as {@link AppendNew} (emit, FOCUS, normalize, undo/redo), but
 * the caller supplies the element instead of an {@link ElementSpec}.
 */
export class AppendElement implements UndoRecord {
  static run(state: EditorState, element: HTMLElement): AppendElement | undefined {
    if (state.isEditing()) return;
    const focus = state.nav.getFocus();
    if (!focus) return;

    const op = focusable.appendElement(element, focus);
    const focusTarget = focusable.getInitialFocusTarget(op.element);
    state.eventsEmitter.emitElementChange({
      type: 'focusable-inserted',
      element: op.element
    });
    state.nav.FOCUS(focusTarget);

    const record = new AppendElement(op, { undo: focus, redo: focusTarget });
    record.normalize();
    return record;
  }

  constructor(
    private op: focusable.AppendElement,
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
    focusable.undoAppendElement(this.op);
    state.nav.FOCUS(this.focusTarget.undo);
    this.normalize();
  }

  redo(state: EditorState) {
    focusable.redoAppendElement(this.op);
    state.nav.FOCUS(this.focusTarget.redo);
    this.normalize();
  }
}
