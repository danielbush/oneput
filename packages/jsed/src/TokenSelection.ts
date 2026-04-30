import { JSED_SELECTION_CLASS, JSED_TOKEN_CLASS } from './lib/constants.js';
import { getLine } from './lib/sibwalk.js';
import { isInlineFlow } from './lib/taxonomy.js';
import * as token from './lib/token.js';
import { TokenCursor } from './TokenCursor.js';
import type { JsedDocument } from './types.js';
import type { CursorMotion } from './CursorMotion.js';
import type { CursorTextOps } from './CursorTextOps.js';

/**
 * A growing range of LINE_SIBLING's, visually represented by
 * SELECTION_WRAPPER elements inserted as direct parents of contiguous
 * TOKEN runs.
 *
 * - creates new segments (Wrappers) when parentNode changes
 * - `head` is driven by an internal silent cursor.
 * - `anchor` is initial starting point
 */
export class TokenSelection {
  static create(params: {
    seed: HTMLElement;
    document: JsedDocument;
    motion: CursorMotion;
    textOps: CursorTextOps;
  }): TokenSelection {
    return new TokenSelection(params);
  }

  private anchor: HTMLElement;
  private headCursor: TokenCursor;
  /** Ordered front → back, one per contiguous same-parent run. */
  private wrappers: HTMLElement[] = [];

  constructor(params: {
    seed: HTMLElement;
    document: JsedDocument;
    motion: CursorMotion;
    textOps: CursorTextOps;
  }) {
    this.anchor = params.seed;
    this.headCursor = TokenCursor.create({
      document: params.document,
      motion: params.motion,
      textOps: params.textOps,
      token: params.seed,
      onCursorChange: () => {},
      onError: () => {},
      silent: true
    });
    this.wrappers.push(this.openWrapper(params.seed));
  }

  getAnchor(): HTMLElement {
    return this.anchor;
  }

  getHead(): HTMLElement {
    return this.headCursor.getToken();
  }

  /**
   * Move the head one LINE_SIBLING forward. Grows the forward side of
   * the wrapper when head is at or after the anchor; shrinks the
   * backward side when head is before the anchor.
   */
  extendNext(): void {
    const before = this.headCursor.getToken();
    const wasBeforeAnchor = this.isBeforeAnchor(before);
    this.headCursor.moveNext();
    const next = this.headCursor.getToken();
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
    const before = this.headCursor.getToken();
    const wasAfterAnchor = this.isAfterAnchor(before);
    this.headCursor.movePrevious();
    const prev = this.headCursor.getToken();
    if (prev === before) return;
    if (wasAfterAnchor) {
      this.shrinkBack(prev);
    } else {
      this.growFront(prev);
    }
  }

  /**
   * Grow at the back. If `next` shares a parent with the current back
   * wrapper, absorb the intervening nodes + `next`. Otherwise we've
   * crossed a parent boundary (entering/leaving an INLINE_FLOW, or
   * spanning LINE's) — open a new wrapper around `next` in its own
   * parent.
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
   */
  collapse(): void {
    for (const wrapper of this.wrappers) this.unwrap(wrapper);
    this.wrappers = [];
    this.headCursor.destroy();
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
    this.headCursor.destroy();
    return wrapped;
  }

  /**
   * Reduce the selection to its START (earlier in document order):
   * unwrap SELECTION_WRAPPER's, remove every selected TOKEN except the
   * start, clean up any structural containers that were fully consumed
   * and became empty. Returns the surviving start TOKEN so callers can
   * re-seat their CURSOR on it.
   *
   * "Start" = the end of the selection that is earlier in the document:
   * forward extension → anchor; backward extension → head. This matches
   * standard text-editor behaviour where typing over a selection lands
   * the new content at the beginning of what was selected.
   *
   * Cleanup rules:
   * - INLINE_FLOW ancestor (em, span) fully consumed by the selection
   *   → removed. If it was an ancestor of the start TOKEN, start is
   *   lifted out first.
   * - LINE (p, div) fully consumed → removed, EXCEPT when it hosts the
   *   start TOKEN (which is what the user will type into).
   */
  collapseToStart(): HTMLElement {
    const keeper = this.getBackwardEnd();
    // Snapshot the selected TOKEN's before unwrapping — the
    // `.jsed-selection` wrappers go away once we collapse.
    const selectedTokens = Array.from(
      this.wrappers.flatMap((w) => Array.from(w.querySelectorAll(`.${JSED_TOKEN_CLASS}`)))
    ) as HTMLElement[];
    const selectedSet = new Set(selectedTokens);

    // LINE's the selection fully consumed (every TOKEN in the LINE is
    // in the selection).
    const fullyConsumedLines = new Set<HTMLElement>();
    for (const wrapper of this.wrappers) {
      const line = getLine(wrapper);
      if (fullyConsumedLines.has(line)) continue;
      const tokensInLine = Array.from(
        line.querySelectorAll(`.${JSED_TOKEN_CLASS}`)
      ) as HTMLElement[];
      if (tokensInLine.every((t) => selectedSet.has(t))) {
        fullyConsumedLines.add(line);
      }
    }

    // INLINE_FLOW containers (em, span) the selection fully consumed —
    // walk up from each selected TOKEN.
    const consumedCTContainers = new Set<HTMLElement>();
    const visitedCT = new Set<HTMLElement>();
    for (const tok of selectedTokens) {
      for (let anc = tok.parentElement; anc && isInlineFlow(anc); anc = anc.parentElement) {
        if (visitedCT.has(anc)) continue;
        visitedCT.add(anc);
        const ancTokens = Array.from(anc.querySelectorAll(`.${JSED_TOKEN_CLASS}`)) as HTMLElement[];
        if (ancTokens.every((t) => selectedSet.has(t))) {
          consumedCTContainers.add(anc);
        }
      }
    }

    this.collapse();

    // Lift keeper out of its own consumed INLINE_FLOW ancestors
    // (innermost → outermost). Done BEFORE pruning so keeper ends up as
    // a proper token sibling in the surviving LINE context; otherwise
    // `token.remove` would insert stray ANCHOR's when it can't find a
    // token sibling at the detached level.
    let outermostConsumedForKeeper: HTMLElement | null = null;
    for (let anc = keeper.parentElement; anc && isInlineFlow(anc); anc = anc.parentElement) {
      if (!consumedCTContainers.has(anc)) break;
      outermostConsumedForKeeper = anc;
    }
    if (outermostConsumedForKeeper) {
      outermostConsumedForKeeper.replaceWith(keeper);
    }

    // Prune all other selected TOKEN's. Skip any already-detached TOKEN
    // (those inside a lifted-away ancestor).
    for (const tok of selectedTokens) {
      if (tok === keeper) continue;
      if (!tok.isConnected) continue;
      token.remove(tok);
    }

    // Remove any consumed INLINE_FLOW container still in the DOM
    // that doesn't host keeper (keeper's lift handled its ancestors).
    for (const container of consumedCTContainers) {
      if (!container.isConnected) continue;
      if (container.contains(keeper)) continue;
      container.remove();
    }

    // Remove fully-consumed LINE's except keeper's own — keeper will be
    // rewritten by the caller and needs its LINE to live in.
    for (const line of fullyConsumedLines) {
      if (!line.isConnected) continue;
      if (line.contains(keeper)) continue;
      line.remove();
    }

    return keeper;
  }
}
