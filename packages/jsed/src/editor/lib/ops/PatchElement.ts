import type { EditorState } from '../EditorState.js';
import {
  patchElement,
  redoPatchElement,
  undoPatchElement,
  type ElementPatch,
  type PatchElementOperation
} from '../../../lib/ops/elementPatch.js';
import type { UndoRecord } from '../../../undo/index.js';
import { isFocusable } from '../../../lib/core/taxonomy.js';
import { normalize } from '../../../lib/ops/normalize.js';
import { detokenize } from '../../../lib/ops/tokenize.js';

/**
 * Editor-level operation for patching an existing element.
 */
export class PatchElement implements UndoRecord {
  /**
   * Apply a patch, or return undefined when its requested state is unchanged.
   */
  static run(
    state: EditorState,
    element: HTMLElement,
    patch: ElementPatch
  ): PatchElement | undefined {
    if (patch.html !== undefined) {
      if (state.isEditing()) {
        state.exitEditing();
      }
      moveAffectedFocus(state, element);
      detokenize(element);
    }

    const operation = patchElement(element, patch);
    if (!operation) {
      return;
    }

    const record = new PatchElement(operation);
    record.normalize();
    state.eventsEmitter.emitElementChange({
      type: 'focusable-patched',
      element
    });
    return record;
  }

  constructor(private operation: PatchElementOperation) {}

  undo(_state: EditorState): void {
    undoPatchElement(this.operation);
    this.normalize();
  }

  redo(_state: EditorState): void {
    redoPatchElement(this.operation);
    this.normalize();
  }

  /**
   * Re-assert derived structure after replacing authored child markup.
   */
  private normalize(): void {
    if (this.operation.patch.html !== undefined) {
      normalize(this.operation.element);
    }
  }
}

/**
 * Move FOCUS to the nearest surviving FOCUSABLE before replacing descendants.
 */
function moveAffectedFocus(state: EditorState, element: HTMLElement): void {
  const focus = state.nav.getFocus();
  if (!focus || focus === element || !element.contains(focus)) {
    return;
  }

  let target: Element | null = element;
  while (target) {
    if (isFocusable(target)) {
      state.nav.FOCUS(target);
      return;
    }
    target = target.parentElement;
  }
  state.nav.FOCUS(state.document.root);
}
