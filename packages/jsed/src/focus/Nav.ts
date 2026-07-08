import type { JsedDocument, JsedFocusRequestEvent } from '../types.js';
import {
  isFocusCandidate,
  isIsland,
  isFocusable,
  isToken,
  JSED_APP_ROOT_ID,
  JSED_FOCUS_CLASS,
  JSED_FOCUS_SIBLING
} from '../lib/core/taxonomy.js';
import * as token from '../lib/ops/token.js';
import { getParent, findNextNode, findPreviousNode } from '../lib/core/walk.js';
import {
  findNextNode as findNextNode2,
  findPreviousNode as findPreviousNode2
} from '../lib/core/walk2.js';
import { FocusChainNavigator } from './FocusChainNavigator.js';
import { getNextSibling, getPreviousSibling } from '../lib/core/sibling.js';

export type OnRequestFocus = (evt: JsedFocusRequestEvent) => boolean;

export type NavError =
  | { type: 'no-token-under-focus' }
  | {
      /**
       * TODO: should we ever let this happen?
       */
      type: 'no-focus';
    };

/**
 * Manages the FOCUS.
 *
 * Each Nav instance owns its lifecycle: call `connect()` to start listening
 * for DOM events and `disconnect()` to stop. The optional `onRequestFocus`
 * is immutable — set once at construction.
 */
export class Nav {
  static create(doc: JsedDocument): Nav {
    return new Nav(doc);
  }

  static createNull(doc: JsedDocument): Nav {
    return new Nav(doc);
  }

  /**
   * The focus FOCUSABLE .  If a TOKEN is focused, this will be set to the parent
   * FOCUSABLE for that TOKEN.
   */
  #FOCUS?: HTMLElement;
  #connected = false;
  #focusChainNavigator: FocusChainNavigator;

  get document(): JsedDocument {
    return this.doc;
  }

  constructor(
    private doc: JsedDocument,
    private onRequestFocus?: OnRequestFocus,
    private onFocusChange?: (focus: HTMLElement) => void
  ) {
    this.#focusChainNavigator = FocusChainNavigator.create(this);
  }

  /**
   * Start listening for DOM events and show the element indicator.
   */
  connect({
    onRequestFocus,
    onFocusChange
  }: {
    onRequestFocus?: OnRequestFocus;
    onFocusChange?: (focus: HTMLElement) => void;
  } = {}) {
    this.onFocusChange = onFocusChange;
    this.onRequestFocus = onRequestFocus;
    if (this.#connected) return;
    this.#connected = true;
    this.doc.root.addEventListener<'mousedown'>('mousedown', this.handleElementClick);
  }

  /**
   * Stop listening for DOM events and hide the element indicator.
   */
  disconnect() {
    if (!this.#connected) return;
    this.#connected = false;
    this.doc.root.removeEventListener('mousedown', this.handleElementClick);
    this.#SIB_HIGHLIGHT_CLEAR();
    this.clearFocus();
  }

  /**
   * Disconnect and permanently tear down stuff.
   * The instance cannot be used after this.
   */
  destroy() {
    this.disconnect();
  }

  private handleElementClick = (evt: MouseEvent) => {
    const app_root_node = document.getElementById(JSED_APP_ROOT_ID);
    if (app_root_node) {
      const node = evt.target as Element;
      if (app_root_node.contains(node)) {
        return;
      }
    }
    // Prevent default actions like blurring the input in jsed-ui (assumes "mousedown").
    evt.preventDefault();
    this.REQUEST_FOCUS(evt.target);
  };

  // Actions

  getFocus(): HTMLElement | null {
    return this.#FOCUS ?? null;
  }

  clearFocus(): void {
    if (this.#FOCUS) {
      this.#FOCUS.classList.remove(JSED_FOCUS_CLASS);
      this.#FOCUS = undefined;
    }
  }

  #updateFocus(el: HTMLElement) {
    if (isToken(el)) {
      el = token.getParent(el);
    }
    if (!isFocusable(el)) {
      throw new Error('#updateFocus: expects a FOCUSABLE');
    }
    if (this.#FOCUS) {
      this.#FOCUS.classList.remove(JSED_FOCUS_CLASS);
    }
    this.#FOCUS = el;
    this.#FOCUS.classList.add(JSED_FOCUS_CLASS);
    if (el !== this.doc.root) {
      this.doc.viewportScroller.scrollIntoViewIfHidden(el);
    }
    this.#focusChainNavigator.handleFocusChange(this.#FOCUS);
    this.onFocusChange?.(this.#FOCUS!);
  }

  /**
   * Find next using depth first recursion.
   */
  REC_NEXT() {
    if (!this.#FOCUS) return;
    for (const next of findNextNode(this.#FOCUS, this.doc.root, {
      visit: isFocusable,
      descend: (node) => isFocusCandidate(node) && !isIsland(node)
    })) {
      this.REQUEST_FOCUS(next);
      return;
    }
    return;
  }

  /**
   * Find previous using depth first recursion.
   */
  REC_PREV() {
    if (!this.#FOCUS) return;
    for (const next of findPreviousNode(this.#FOCUS, this.doc.root, {
      visit: isFocusable,
      descend: (node) => isFocusCandidate(node) && !isIsland(node)
    })) {
      this.REQUEST_FOCUS(next);
      return;
    }
    return;
  }

  #sibnext = () => (this.#FOCUS ? (getNextSibling(this.#FOCUS, isFocusable) as HTMLElement) : null);

  #sibprev = () =>
    this.#FOCUS ? (getPreviousSibling(this.#FOCUS, isFocusable) as HTMLElement) : null;

  /**
   * Find next sibling element if there is one.
   */
  SIB_NEXT() {
    const next = this.#sibnext();
    if (next) {
      this.REQUEST_FOCUS(next);
      return;
    }
    return;
  }

  /**
   * Move to the next sibling FOCUSABLE; if the siblings are exhausted, climb to
   * the nearest ancestor that has a following FOCUSABLE and FOCUS that.
   *
   * Composes two layers, each keeping its charter:
   * - sibling.ts (`getNextSibling`) does the flat, same-parentNode hop.
   * - walk2 (`findNextNode`) does the cross-parent climb. We start the walk at
   *   the parent (not #FOCUS) and disable descent, so we never re-scan #FOCUS's
   *   siblings and never descend — it is strictly "next sibling, otherwise up".
   *
   * Because only `pre` is supplied, ancestors themselves are never matched
   * (going forward only their `post` fires on exit), matching pre-order: parents
   * were already visited on the way down.
   */
  SIB_NEXT_OR_UP() {
    if (!this.#FOCUS) return;

    const sib = getNextSibling(this.#FOCUS, isFocusable) as HTMLElement | null;
    if (sib) {
      this.REQUEST_FOCUS(sib);
      return;
    }

    const parent = this.#FOCUS.parentNode;
    if (!parent || parent === this.doc.root) return;

    const up = findNextNode2(parent, {
      ceiling: this.doc.root,
      shouldDescend: () => false,
      pre: (node) => (isFocusable(node) ? node : undefined)
    });
    if (up) {
      this.REQUEST_FOCUS(up as HTMLElement);
    }
  }

  /**
   * Find previous sibling element if there is one.
   */
  SIB_PREV() {
    const next = this.#sibprev();
    if (next) {
      this.REQUEST_FOCUS(next);
      return;
    }
    return;
  }

  /**
   * Move to the previous sibling FOCUSABLE; if the previous siblings are
   * exhausted, climb to the parent and FOCUS it. The mirror of
   * {@link SIB_NEXT_OR_UP}, except parents *are* visited here.
   *
   * Same composition: sibling.ts (`getPreviousSibling`) does the flat hop;
   * walk2 (`findPreviousNode`) does the climb. We start the walk at the parent
   * with `visitStart` so `pre(parent)` fires first — in reverse pre-order an
   * ancestor's `pre` is its predecessor, so the parent is the natural next stop.
   * `shouldDescend: () => false` keeps it "up only, never down".
   */
  SIB_PREV_OR_UP() {
    if (!this.#FOCUS) return;

    const sib = getPreviousSibling(this.#FOCUS, isFocusable) as HTMLElement | null;
    if (sib) {
      this.REQUEST_FOCUS(sib);
      return;
    }

    const parent = this.#FOCUS.parentNode;
    if (!parent || parent === this.doc.root) return;

    const up = findPreviousNode2(parent, {
      ceiling: this.doc.root,
      shouldDescend: () => false,
      visitStart: true,
      pre: (node) => (isFocusable(node) ? node : undefined)
    });
    if (up) {
      this.REQUEST_FOCUS(up as HTMLElement);
    }
  }

  /**
   * Find next parent.
   */
  UP(): void {
    if (!this.#FOCUS) return;
    const next = getParent(this.#FOCUS, this.doc.root);
    if (next) {
      this.REQUEST_FOCUS(next);
    }
    return;
  }

  UP_CHAIN(): void {
    this.#focusChainNavigator.moveUp();
  }

  DOWN_CHAIN(): void {
    this.#focusChainNavigator.moveDown();
  }

  /**
   * Focus an element if it is an FOCUSABLE .
   */
  FOCUS(el: HTMLElement): void {
    this.#updateFocus(el);
    this.SIB_HIGHLIGHT();
  }

  /**
   * Request FOCUS for an element `el`, if request is allow, focus.
   *
   * CURSOR is checked first.
   */
  REQUEST_FOCUS(el: Element | EventTarget | null): void {
    if (!el) {
      return;
    }
    // If there are no listeners, we'll assume ok = true.
    if (isFocusable(el)) {
      const ok =
        this.onRequestFocus?.({
          type: 'FOCUS_REQUEST',
          targetType: 'FOCUSABLE',
          element: el
        }) ?? true;
      if (ok) {
        this.FOCUS(el);
      }
      return;
    }
    if (isToken(el as Node)) {
      const htmlEl = el as HTMLElement;
      const ok =
        this.onRequestFocus?.({
          type: 'FOCUS_REQUEST',
          targetType: 'TOKEN',
          token: htmlEl,
          value: token.getValue(htmlEl)
        }) ?? true;
      if (ok) {
        this.FOCUS(htmlEl);
      }
    }
  }

  #SIB_HIGHLIGHT_CLEAR(): void {
    for (const sib of this.doc.SIB_HIGHLIGHT) {
      sib.classList.remove(JSED_FOCUS_SIBLING);
    }
    this.doc.SIB_HIGHLIGHT.clear();
  }

  /**
   * Highlight siblings of currently focused element.
   */
  SIB_HIGHLIGHT(): void {
    this.#SIB_HIGHLIGHT_CLEAR();
    const active = this.#FOCUS;
    if (!active) return;
    const next = this.#sibnext();
    const prev = this.#sibprev();
    if (next) {
      next.classList.add(JSED_FOCUS_SIBLING);
      this.doc.SIB_HIGHLIGHT.add(next);
    }
    if (prev) {
      prev.classList.add(JSED_FOCUS_SIBLING);
      this.doc.SIB_HIGHLIGHT.add(prev);
    }
  }
}
