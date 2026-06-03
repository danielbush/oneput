import { deleteHighestEmpty, isEmpty } from '../ops/focusable.js';
import { isInlineFlow, JSED_SELECTION_CLASS } from '../core/taxonomy.js';
import * as token from '../ops/token.js';
import { createAnchor } from '../ops/anchor.js';
import type { CursorState } from '../cursor/CursorState.js';
import { getSeparatorAfter, getSeparatorBefore } from '../ops/space.js';

/**
 * A growing range of LINE_SIBLING's, visually represented by
 * SELECTION_WRAPPER elements inserted as direct parents of contiguous
 * TOKEN runs.
 *
 * - creates new segments (wrappers (isSelectionWrapper)) when parentNode changes
 * - wrappers suck in what the CURSOR lands on and possibly trailing SEPARATOR's
 * - this means there could be gaps - things at the edges before or after a
 * FOCUSABLE boundary that aren't included in the selection, but these thigns
 * are probably exotic :D
 * - we use a real CURSOR - this solves finding the next LINE_SIBLING but also ensures things are tokenized
 *
 * Terminology
 *
 *   (anchor) A|------------->> (head)
 *   (head)   <<-------------|A (anchor)
 *
 * - `head` is driven by an internal silent cursor.
 * - `anchor` is initial starting point (constant)
 *
 *   (front) A|------------->> (back)
 *   (front) <<-------------|A (back)
 *
 * - `front`/`back` are always document-order.
 */
export class CursorSelection {
  static create(params: {
    cursor: CursorState;
    seed: HTMLElement;
    root: HTMLElement;
  }): CursorSelection {
    return new CursorSelection(params.cursor, params.seed, params.root);
  }

  /** Ordered front → back, one per contiguous same-parent run. */
  private wrappers: HTMLElement[] = [];

  constructor(
    private headCursor: CursorState,
    private anchor: HTMLElement,
    private root: HTMLElement
  ) {
    this.wrappers.push(this.openWrapper(anchor));
  }

  getAnchor(): HTMLElement {
    return this.anchor;
  }

  getHead(): HTMLElement {
    return this.headCursor.getPlace();
  }

  /**
   * Move the head one LINE_SIBLING forward. Grows the forward side of
   * the wrapper when head is at or after the anchor; shrinks the
   * backward side when head is before the anchor.
   */
  extendNext(): void {
    const before = this.headCursor.getPlace();
    const wasBeforeAnchor = this.isBeforeAnchor(before);
    this.headCursor.ops.moveNext(true);
    const next = this.headCursor.getPlace();
    if (next === before) return;
    if (wasBeforeAnchor) {
      this.shrinkFront(next);
    } else {
      this.growBack(next);
    }
  }

  /**
   * Move the head one LINE_SIBLING backward. Grows the backward side of
   * the wrapper when head is at or before the anchor; shrinks the
   * forward side when head is after the anchor.
   */
  extendPrevious(): void {
    const before = this.headCursor.getPlace();
    const wasAfterAnchor = this.isAfterAnchor(before);
    this.headCursor.ops.movePrevious(true);
    const prev = this.headCursor.getPlace();
    if (prev === before) return;
    if (wasAfterAnchor) {
      this.shrinkBack(prev);
    } else {
      this.growFront(prev);
    }
  }

  /**
   * (front) A|------>> (back)
   *
   * `next` is assumed to be what the cursor has done a moveNext to.
   */
  private growBack(next: HTMLElement): void {
    const wrapper = this.wrappers[this.wrappers.length - 1];
    if (wrapper.parentNode === next.parentNode) {
      let node: Node | null = wrapper.nextSibling;
      while (node && node !== next) {
        const following: Node | null = node.nextSibling;
        wrapper.appendChild(node);
        node = following;
      }
      if (node === next) {
        // Pull in SEPARATOR eg just before an em-tag...
        // GOTCHA: scan for separator BEFORE we appendChild(next)!
        const sepAfter = getSeparatorAfter(next);
        wrapper.appendChild(next);
        if (sepAfter) {
          wrapper.appendChild(sepAfter);
        }
      }
    } else {
      // Pull in any SEPARATOR eg just after an em-tag...
      const sepBefore = getSeparatorBefore(next);
      const wrapper = this.openWrapper(next);
      this.wrappers.push(wrapper);
      if (sepBefore) {
        next.before(sepBefore);
      }
    }
  }

  /**
   * (front) <<-------|A (back)
   *
   * `prev` is assumed to be what the cursor has done a movePrevious to.
   */
  private growFront(prev: HTMLElement): void {
    const front = this.wrappers[0];
    if (front.parentNode === prev.parentNode) {
      let node: Node | null = front.previousSibling;
      while (node && node !== prev) {
        const preceding: Node | null = node.previousSibling;
        front.insertBefore(node, front.firstChild);
        node = preceding;
      }
      if (node === prev) front.insertBefore(prev, front.firstChild);
    } else {
      this.wrappers.unshift(this.openWrapper(prev));
    }
  }

  /**
   * (front) A|--------<< (back)
   */
  private shrinkBack(prev: HTMLElement): void {
    const back = this.wrappers[this.wrappers.length - 1];
    if (!back) return;
    if (back.contains(prev)) {
      while (back.lastChild && back.lastChild !== prev) {
        back.after(back.lastChild);
      }
    } else {
      this.unwrap(back);
      this.wrappers.pop();
    }
  }

  /**
   * (front) >>---------|A (back)
   */
  private shrinkFront(next: HTMLElement): void {
    const front = this.wrappers[0];
    if (!front) return;
    if (front.contains(next)) {
      while (front.firstChild && front.firstChild !== next) {
        front.before(front.firstChild);
      }
    } else {
      this.unwrap(front);
      this.wrappers.shift();
    }
  }

  private openWrapper(el: HTMLElement): HTMLElement {
    const wrapper = el.ownerDocument.createElement('span');
    wrapper.className = JSED_SELECTION_CLASS;
    el.before(wrapper);
    const sepAfter = getSeparatorAfter(el);
    wrapper.appendChild(el);
    if (sepAfter) {
      el.after(sepAfter);
    }
    return wrapper;
  }

  private unwrap(wrapper: HTMLElement): void {
    wrapper.replaceWith(...Array.from(wrapper.childNodes));
  }

  private containsOnlyMarker(el: HTMLElement, marker: HTMLElement): boolean {
    return Array.from(el.childNodes).every((child) => {
      if (child === marker) return true;
      return child.nodeType === Node.TEXT_NODE && child.textContent?.trim() === '';
    });
  }

  private isAfterAnchor(el: HTMLElement): boolean {
    if (el === this.anchor) return false;
    return !!(this.anchor.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING);
  }

  private isBeforeAnchor(el: HTMLElement): boolean {
    if (el === this.anchor) return false;
    return !!(this.anchor.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_PRECEDING);
  }

  /**
   * Whichever of anchor/head is later in document order. When the
   * selection hasn't been extended, both are the same element.
   */
  getForwardEnd(): HTMLElement {
    return this.isAfterAnchor(this.getHead()) ? this.getHead() : this.anchor;
  }

  /**
   * Whichever of anchor/head is earlier in document order. When the
   * selection hasn't been extended, both are the same element.
   */
  getBackwardEnd(): HTMLElement {
    return this.isBeforeAnchor(this.getHead()) ? this.getHead() : this.anchor;
  }

  /**
   * Unwrap every SELECTION_WRAPPER in place, leaving TOKEN's and
   * spacing text nodes untouched.
   *
   * collapse = collapse the selection range, no effect on the selected elements
   */
  collapse(): void {
    for (const wrapper of this.wrappers) this.unwrap(wrapper);
    this.wrappers = [];
  }

  wrapWithTag(tagName: string): HTMLElement[] | null {
    if (!this.wrappers.every((wrapper) => token.canWrapElementChildrenWithTag(wrapper, tagName))) {
      return null;
    }

    const wrapped = this.wrappers.flatMap((wrapper) => {
      const element = token.wrapElementChildrenWithTag(wrapper, tagName);
      return element ? [element] : [];
    });
    this.wrappers = [];
    return wrapped;
  }

  /**
   * Reduce the selection to its START (earlier in document order):
   * replace selected SELECTION_WRAPPER's with an ANCHOR at the start,
   * clean up any structural containers that were fully consumed and
   * became empty.
   *
   * Returns the surviving start ANCHOR so callers can re-seat their CURSOR on
   * it and rewrite it as normal TOKEN text.
   */
  delete(): HTMLElement {
    const start = this.getBackwardEnd();
    const startWrapper = this.wrappers.find((wrapper) => wrapper.contains(start));
    if (!startWrapper?.parentElement) {
      throw new Error('delete: selection start wrapper not found');
    }

    const marker = createAnchor();
    startWrapper.before(marker);

    const cleanupParents = new Set<HTMLElement>();
    for (const wrapper of this.wrappers) {
      if (wrapper.parentElement) {
        cleanupParents.add(wrapper.parentElement);
      }
      wrapper.remove();
    }
    this.wrappers = [];

    // If selection consumed an entire INLINE_FLOW branch, the marker is now the
    // only meaningful child. Lift it out so replacement text does not inherit
    // formatting that was deleted with the selection.
    for (let anc = marker.parentElement; anc && isInlineFlow(anc); anc = marker.parentElement) {
      if (!this.containsOnlyMarker(anc, marker)) break;
      cleanupParents.add(anc.parentElement ?? anc);
      anc.replaceWith(marker);
    }

    for (const parent of cleanupParents) {
      if (!parent.isConnected) continue;
      if (!isEmpty(parent)) continue;
      deleteHighestEmpty(parent, this.root, false);
    }

    return marker;
  }
}
