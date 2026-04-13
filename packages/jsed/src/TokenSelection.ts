import { JSED_SELECTION_CLASS } from './lib/constants.js';
import { getNextLineSibling, getPreviousLineSibling } from './lib/sibwalk.js';

/**
 * A growing range of LINE_SIBLING's, visually represented by
 * SELECTION_WRAPPER elements inserted as direct parents of contiguous
 * TOKEN runs.
 *
 * A SELECTION_WRAPPER is a styling-neutral inline span (background only)
 * that wraps a run of LINE_SIBLING's sharing the same immediate DOM
 * parent. Inserting it between `<em>`/`<strong>`/etc. and its TOKEN's
 * preserves inherited styling (italic, bold, underline, color) because
 * CSS inheritance follows the DOM ancestor chain and we only add a
 * descendant, never move TOKEN's out of their styling context.
 *
 * When the selection crosses a parent boundary — entering or leaving an
 * INLINE_FLOW, or (eventually) spanning LINE's — a new wrapper is
 * started in the new parent. The list of wrappers is therefore ordered
 * and one-per-contiguous-run.
 *
 * First pass is intentionally within a single LINE. Cross-LINE
 * selection is a follow-up.
 *
 * Standalone for now: `TokenSelection` does its own LINE_SIBLING
 * traversal via `sibwalk` and does not move `TokenCursor`. Whether the
 * CURSOR should follow the head is a decision to make after seeing
 * this render.
 *
 * See work/active/20260414.feat.selections.md.
 */
export class TokenSelection {
  static create(params: { seed: HTMLElement }): TokenSelection {
    return new TokenSelection(params.seed);
  }

  private anchor: HTMLElement;
  private head: HTMLElement;
  /** Ordered front → back, one per contiguous same-parent run. */
  private wrappers: HTMLElement[] = [];

  constructor(seed: HTMLElement) {
    this.anchor = seed;
    this.head = seed;
    this.wrappers.push(this.openWrapper(seed));
  }

  getAnchor(): HTMLElement {
    return this.anchor;
  }

  getHead(): HTMLElement {
    return this.head;
  }

  /**
   * Move the head one LINE_SIBLING forward. Grows the forward side of
   * the wrapper when head is at or after the anchor; shrinks the
   * backward side when head is before the anchor.
   */
  extendNext(): void {
    const next = getNextLineSibling(this.head);
    if (!next) return;
    if (this.isHeadBeforeAnchor()) {
      this.shrinkFront(next);
    } else {
      this.growBack(next);
    }
    this.head = next;
  }

  /**
   * Move the head one LINE_SIBLING backward. Grows the backward side of
   * the wrapper when head is at or before the anchor; shrinks the
   * forward side when head is after the anchor.
   */
  extendPrevious(): void {
    const prev = getPreviousLineSibling(this.head);
    if (!prev) return;
    if (this.isHeadAfterAnchor()) {
      this.shrinkBack(prev);
    } else {
      this.growFront(prev);
    }
    this.head = prev;
  }

  /**
   * Grow at the back. If `next` shares a parent with the current back
   * wrapper, absorb the intervening nodes + `next`. Otherwise we've
   * crossed a parent boundary (entering or leaving an INLINE_FLOW) —
   * open a new wrapper around `next` in its own parent.
   */
  private growBack(next: HTMLElement): void {
    const back = this.wrappers[this.wrappers.length - 1];
    if (back.parentNode === next.parentNode) {
      let node: Node | null = back.nextSibling;
      while (node && node !== next) {
        const following: Node | null = node.nextSibling;
        back.appendChild(node);
        node = following;
      }
      if (node === next) back.appendChild(next);
    } else {
      this.wrappers.push(this.openWrapper(next));
    }
  }

  /** Mirror of growBack. */
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
   * Shrink from the back end toward the anchor. If `prev` is in the
   * back wrapper, peel its trailing nodes until `prev` is the last
   * child. Otherwise `prev` lives outside this wrapper (we've stepped
   * back across a parent boundary), so unwrap the back wrapper whole
   * and drop it from the list — the new back wrapper already contains
   * `prev`.
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

  /** Mirror of shrinkBack. */
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
    wrapper.appendChild(el);
    return wrapper;
  }

  private unwrap(wrapper: HTMLElement): void {
    wrapper.replaceWith(...Array.from(wrapper.childNodes));
  }

  private isHeadAfterAnchor(): boolean {
    if (this.head === this.anchor) return false;
    return !!(this.anchor.compareDocumentPosition(this.head) & Node.DOCUMENT_POSITION_FOLLOWING);
  }

  private isHeadBeforeAnchor(): boolean {
    if (this.head === this.anchor) return false;
    return !!(this.anchor.compareDocumentPosition(this.head) & Node.DOCUMENT_POSITION_PRECEDING);
  }

  /**
   * Unwrap every SELECTION_WRAPPER in place, leaving TOKEN's and
   * spacing text nodes untouched.
   */
  collapse(): void {
    for (const wrapper of this.wrappers) this.unwrap(wrapper);
    this.wrappers = [];
    this.head = this.anchor;
  }
}
