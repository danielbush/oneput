import type { JsedDocument, JsedFocusRequestEvent } from '../types.js';
import {
  isFocusCandidate,
  isOpaque,
  isFocusable,
  isToken,
  JSED_APP_ROOT_ID,
  JSED_FOCUS_CLASS,
  JSED_FOCUS_SIBLING
} from '../lib/core/taxonomy.js';
import * as token from '../lib/ops/token.js';
import { getParent, findNextNode, findPreviousNode } from '../lib/core/walk.js';
import { FocusChainNavigator } from './FocusChainNavigator.js';

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
      descend: (node) => isFocusCandidate(node) && !isOpaque(node)
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
      descend: (node) => isFocusCandidate(node) && !isOpaque(node)
    })) {
      this.REQUEST_FOCUS(next);
      return;
    }
    return;
  }

  #sibnext = () =>
    this.#FOCUS && this.#FOCUS !== this.doc.root ? this.#nextSiblingFocusTarget(this.#FOCUS) : null;

  #sibprev = () =>
    this.#FOCUS && this.#FOCUS !== this.doc.root
      ? this.#previousSiblingFocusTarget(this.#FOCUS)
      : null;

  #firstFocusableDescendant(el: Node): HTMLElement | null {
    for (const next of findNextNode(el, el, {
      visit: isFocusable,
      descend: (node) => isFocusCandidate(node) && !isOpaque(node)
    })) {
      return next as HTMLElement;
    }
    return null;
  }

  #lastFocusableDescendant(el: Node): HTMLElement | null {
    let last: HTMLElement | null = null;
    for (const next of findNextNode(el, el, {
      visit: isFocusable,
      descend: (node) => isFocusCandidate(node) && !isOpaque(node)
    })) {
      last = next as HTMLElement;
    }
    return last;
  }

  /**
   * Find the next same-parent FOCUS target.
   *
   * If the next sibling is FOCUS_TRANSPARENT, treat it as a tunnel and return
   * the first FOCUSABLE descendant inside that sibling's FOCUS_CANDIDATE
   * subtree. This keeps sibling navigation useful for sections that are not
   * themselves FOCUSABLE but contain descendants that have opted back in.
   */
  #nextSiblingFocusTarget(start: Node): HTMLElement | null {
    let sib: Node | null = start;
    while ((sib = sib.nextSibling)) {
      if (isFocusable(sib)) return sib;
      if (isFocusCandidate(sib) && !isOpaque(sib)) {
        const descendant = this.#firstFocusableDescendant(sib);
        if (descendant) return descendant;
      }
    }
    return null;
  }

  #previousSiblingFocusTarget(start: Node): HTMLElement | null {
    let sib: Node | null = start;
    while ((sib = sib.previousSibling)) {
      if (isFocusable(sib)) return sib;
      if (isFocusCandidate(sib) && !isOpaque(sib)) {
        const descendant = this.#lastFocusableDescendant(sib);
        if (descendant) return descendant;
      }
    }
    return null;
  }

  /**
   * Find next sibling element if there is one.
   *
   * For ordinary FOCUSABLE siblings, `SIB_NEXT` / `SIB_PREV` traverse only same-parent siblings.
   * Supports DESCEND'ing FOCUS_TRANSPARENT's -- see FOCUS_TRANSPARENT_SIBLING.
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
   * Supports DESCEND'ing FOCUS_TRANSPARENT's -- see FOCUS_TRANSPARENT_SIBLING and {@link SIB_NEXT} and
   */
  SIB_NEXT_OR_UP() {
    if (!this.#FOCUS) return;
    if (this.#FOCUS === this.doc.root) {
      return;
    }

    const sib = this.#nextSiblingFocusTarget(this.#FOCUS);
    if (sib) {
      this.REQUEST_FOCUS(sib);
      return;
    }

    for (
      let ancestor = this.#FOCUS.parentNode;
      ancestor && ancestor !== this.doc.root;
      ancestor = ancestor.parentNode
    ) {
      const up = this.#nextSiblingFocusTarget(ancestor);
      if (up) {
        this.REQUEST_FOCUS(up);
        return;
      }
    }
  }

  /**
   * Find previous sibling element if there is one.
   *
   * See {@link SIB_NEXT}
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
   * exhausted, climb to the nearest FOCUSABLE ancestor. The mirror of
   * {@link SIB_NEXT_OR_UP}, except parents *are* visited here.
   *
   * Climb order: land on a FOCUSABLE ancestor before considering that
   * ancestor's previous siblings (so the containing parent is visited). While
   * crossing FOCUS_TRANSPARENT ancestors, tunnel into a previous
   * FOCUS_TRANSPARENT sibling's last FOCUSABLE descendant (see
   * FOCUS_TRANSPARENT_SIBLING) so nested titles can step back to a parent
   * title without skipping to a distant FOCUSABLE.
   */
  SIB_PREV_OR_UP() {
    if (!this.#FOCUS) return;
    if (this.#FOCUS === this.doc.root) {
      return;
    }

    const sib = this.#previousSiblingFocusTarget(this.#FOCUS);
    if (sib) {
      this.REQUEST_FOCUS(sib);
      return;
    }

    for (
      let ancestor = this.#FOCUS.parentNode;
      ancestor && ancestor !== this.doc.root;
      ancestor = ancestor.parentNode
    ) {
      if (isFocusable(ancestor)) {
        this.REQUEST_FOCUS(ancestor);
        return;
      }
      const prev = this.#previousSiblingFocusTarget(ancestor);
      if (prev) {
        this.REQUEST_FOCUS(prev);
        return;
      }
    }
  }

  /**
   * Find the next FOCUSABLE parent.
   *
   * FOCUS_TRANSPARENT ancestors are FOCUS_CANDIDATE's, so they remain part of
   * the FOCUS tree, but they are not valid places to land. UP skips past them
   * and lands on the first non-transparent FOCUSABLE ancestor.
   */
  UP(): void {
    if (!this.#FOCUS) return;
    for (
      let next = getParent(this.#FOCUS, this.doc.root);
      next;
      next = getParent(next, this.doc.root)
    ) {
      if (isFocusable(next)) {
        this.REQUEST_FOCUS(next);
        return;
      }
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
