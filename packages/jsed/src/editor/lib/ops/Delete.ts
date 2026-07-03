import type { EditorState } from '../EditorState.js';
import * as focusable from '../../../lib/ops/focusable.js';
import { canDelete } from '../../../lib/core/dom-rules.js';
import { normalize } from '../../../lib/ops/normalize.js';
import { removeAnchors } from '../../../lib/ops/anchor.js';
import { isFocusable, isIsland } from '../../../lib/core/taxonomy.js';
import { findNextNode, findPreviousNode } from '../../../lib/core/walk.js';
import type { UndoRecord } from '../../../undo/index.js';

/**
 * Editor-level FOCUS operation: delete the focused FOCUSABLE.
 *
 * Mirrors the CURSOR's `DeleteAtCursor` pattern — `run` performs the mutation,
 * emits the element change, moves FOCUS, and returns a {@link UndoRecord} that
 * replays the tripartite low-level op ({@link focusable.deleteElement} /
 * {@link focusable.undoDeleteElement} / {@link focusable.redoDeleteElement}).
 */
export class Delete implements UndoRecord {
  static run(state: EditorState): Delete | undefined {
    if (state.isEditing()) return;
    const focus = state.nav.getFocus();
    if (!focus || !canDelete(focus, state.document)) return;

    const parent = focus.parentElement;
    if (!parent) return;

    const op = focusable.deleteElement(focus);
    state.eventsEmitter.emitElementChange({
      type: 'focusable-removed',
      element: focus
    });

    const record = new Delete(op, focus, parent);
    record.normalize();
    state.nav.FOCUS(record.getRedoFocusTarget());
    return record;
  }

  constructor(
    private op: focusable.DeleteElement,
    private undoFocusTarget: HTMLElement,
    private parent: HTMLElement
  ) {}

  /**
   * Re-assert derived structure in the parent this op emptied or reshaped.
   */
  private normalize() {
    normalize(this.parent);
  }

  /**
   * Find the FOCUSABLE that should receive FOCUS after the element is deleted.
   *
   * Deletion stays local to the surviving parent: prefer the next FOCUSABLE
   * within that parent, then the previous one, then the parent itself.
   */
  private getRedoFocusTarget(): HTMLElement {
    for (const next of findNextNode(this.op.marker, this.parent, {
      visit: isFocusable,
      descend: (node) => !isIsland(node)
    })) {
      return next as HTMLElement;
    }

    for (const previous of findPreviousNode(this.op.marker, this.parent, {
      visit: isFocusable,
      descend: (node) => !isIsland(node)
    })) {
      return previous as HTMLElement;
    }

    return this.parent;
  }

  /**
   * Rebuild the restored shape without anchors left by the deleted shape.
   *
   * Otherwise `normalize` can treat the temporary ANCHOR as interstitial content
   * and preserve an empty IMPLICIT_LINE beside the restored element.
   */
  private normalizeUndo() {
    removeAnchors(this.parent);
    this.normalize();
  }

  undo(state: EditorState) {
    focusable.undoDeleteElement(this.op);
    state.nav.FOCUS(this.undoFocusTarget);
    this.normalizeUndo();
  }

  redo(state: EditorState) {
    focusable.redoDeleteElement(this.op);
    this.normalize();
    state.nav.FOCUS(this.getRedoFocusTarget());
  }
}
