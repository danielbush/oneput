import type { EditorState } from '../EditorState.js';
import type { UndoRecord } from '../../../undo/index.js';
import * as paste from '../../../lib/ops/focusable/paste.js';
import {
  createElementDeleteMarker,
  retainElementPosition,
  restoreRetainedElement
} from '../../../lib/ops/focusable/retention.js';
import { sanitiseDocumentNodes } from '@oneput/safe-html';

/** Paste checked nodes as one undo step. Keep their identity during replay. */
export class PasteElement implements UndoRecord {
  static run(
    state: EditorState,
    source: HTMLElement,
    target: HTMLElement,
    position: 'before' | 'after' | 'within',
    copy: boolean
  ): PasteElement | undefined {
    if (state.isEditing()) return;
    if (!copy && (source === target || source.contains(target))) return;
    if (position !== 'within' && target === state.document.root) return;
    const element = copy ? (source.cloneNode(true) as HTMLElement) : source;
    if (!sanitiseDocumentNodes(element)) return;
    const origin =
      !copy && element.parentNode ? createElementDeleteMarker(element.ownerDocument) : undefined;
    if (origin) element.before(origin);
    const result =
      position === 'before'
        ? paste.pasteBefore(element, target)
        : position === 'after'
          ? paste.pasteAfter(element, target)
          : paste.pasteWithin(element, target);
    if (!result) {
      origin?.remove();
      return;
    }
    const priorFocus = state.nav.getFocus();
    state.nav.FOCUS(element);
    state.eventsEmitter.emitElementChange({ type: 'focusable-inserted', element });
    return new PasteElement(
      element,
      createElementDeleteMarker(element.ownerDocument),
      origin,
      priorFocus
    );
  }

  constructor(
    private element: HTMLElement,
    private destination: HTMLElement,
    private origin: HTMLElement | undefined,
    private priorFocus: HTMLElement | null
  ) {}

  undo(state: EditorState): void {
    retainElementPosition(this.element, this.destination);
    if (this.origin) restoreRetainedElement(this.element, this.origin);
    state.nav.repairFocus(this.priorFocus ?? state.document.root);
  }

  redo(state: EditorState): void {
    if (this.origin) retainElementPosition(this.element, this.origin);
    restoreRetainedElement(this.element, this.destination);
    state.nav.FOCUS(this.element);
  }
}
