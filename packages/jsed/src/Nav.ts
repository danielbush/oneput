import type { JsedDocument, JsedFocusEvent, JsedFocusRequestEvent } from './types.js';
import { JSED_APP_ROOT_ID, JSED_FOCUS_CLASS, SBR_FOCUS_SIBLING } from './lib/constants.js';
import { isIsland, isFocusable, isToken } from './lib/taxonomy.js';
import * as token from './lib/token.js';
import {
  getNextSiblingNode,
  getParent,
  getPreviousSiblingNode,
  findNextNode,
  findPreviousNode
} from './lib/walk.js';
import { ElementIndicator } from './ElementIndicator.js';
import { scrollIntoViewIfSmaller } from './lib/dom.js';

export type FocusController = (evt: JsedFocusRequestEvent) => boolean;

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
 * for DOM events and `disconnect()` to stop. The optional `focusController`
 * is immutable — set once at construction.
 */
export class Nav {
  static create(doc: JsedDocument, focusController?: FocusController): Nav {
    const elementIndicator = ElementIndicator.create();
    return new Nav(doc, elementIndicator, focusController);
  }

  static createNull(doc: JsedDocument, focusController?: FocusController): Nav {
    const elementIndicator = ElementIndicator.createNull();
    return new Nav(doc, elementIndicator, focusController);
  }

  /**
   * The focus FOCUSABLE .  If a TOKEN is focused, this will be set to the parent
   * FOCUSABLE for that TOKEN.
   */
  #FOCUS?: HTMLElement;
  #connected = false;

  get document(): JsedDocument {
    return this.doc;
  }

  constructor(
    private doc: JsedDocument,
    private elementIndicator: ElementIndicator,
    private focusController?: FocusController
  ) {
    this.focusController = focusController;
    this.FOCUS(doc.root);
  }

  /**
   * Start listening for DOM events and show the element indicator.
   */
  connect() {
    if (this.#connected) return;
    this.#connected = true;
    this.doc.root.addEventListener<'mousedown'>('mousedown', this.handleElementClick);
    const focus = this.getFocus();
    this.elementIndicator.updateFocus(focus);
    this.elementIndicator.showIndicator(true);
  }

  /**
   * Stop listening for DOM events and hide the element indicator.
   */
  disconnect() {
    if (!this.#connected) return;
    this.#connected = false;
    this.doc.root.removeEventListener('mousedown', this.handleElementClick);
    this.elementIndicator.showIndicator(false);
  }

  /**
   * Disconnect and permanently tear down the Nav and its ElementIndicator.
   * The instance cannot be used after this.
   */
  destroy() {
    this.disconnect();
    this.elementIndicator.destroy();
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
    this.REQUEST_FOCUS(evt.target, { scrollIntoView: false });
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

  #emitFocusEvent(_evt: JsedFocusEvent) {
    // console.warn('TODO: emit FOCUS event', evt);
  }

  #updateFocus(el: HTMLElement, params?: { scrollIntoView?: boolean }) {
    let tok: HTMLElement | null = null;
    if (isToken(el)) {
      tok = el;
      el = token.getParent(el);
    }
    if (!isFocusable(el)) {
      throw new Error('#updateFocus: expects a FOCUSABLE');
    }
    if (this.#FOCUS) {
      this.#FOCUS.classList.remove(JSED_FOCUS_CLASS);
    }
    this.#FOCUS = el;
    this.elementIndicator.updateFocus(el);
    this.#FOCUS.classList.add(JSED_FOCUS_CLASS);
    if (params?.scrollIntoView ?? true) {
      scrollIntoViewIfSmaller(el);
    }
    this.#emitFocusEvent(
      tok
        ? {
            type: 'FOCUS',
            targetType: 'TOKEN',
            token: tok,
            value: token.getValue(tok)
          }
        : {
            type: 'FOCUS',
            targetType: 'FOCUSABLE',
            element: el
          }
    );
  }

  /**
   * Find next using depth first recursion.
   */
  REC_NEXT() {
    if (!this.#FOCUS) return;
    for (const next of findNextNode(this.#FOCUS, this.doc.root, {
      visit: isFocusable,
      descend: (node) => !isIsland(node)
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
      descend: (node) => !isIsland(node)
    })) {
      this.REQUEST_FOCUS(next);
      return;
    }
    return;
  }

  #sibnext = () =>
    this.#FOCUS
      ? (getNextSiblingNode(this.#FOCUS, this.doc.root, {
          visit: isFocusable
        }) as HTMLElement)
      : null;

  #sibprev = () =>
    this.#FOCUS
      ? (getPreviousSiblingNode(this.#FOCUS, this.doc.root, {
          visit: isFocusable
        }) as HTMLElement)
      : null;

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

  /**
   * Focus an element if it is an FOCUSABLE .
   */
  FOCUS(el: HTMLElement, params?: { scrollIntoView?: boolean }): void {
    this.#updateFocus(el, params);
    this.SIB_HIGHLIGHT();
  }

  /**
   * Request FOCUS for an element `el`, if request is allow, focus and EMIT a
   * FOCUS event.
   *
   * CURSOR is checked first.
   */
  REQUEST_FOCUS(el: Element | EventTarget | null, params?: { scrollIntoView?: boolean }): void {
    if (!el) {
      return;
    }
    // If there are no listeners, we'll assume ok = true.
    if (isFocusable(el)) {
      const ok =
        this.focusController?.({
          type: 'FOCUS_REQUEST',
          targetType: 'FOCUSABLE',
          element: el
        }) ?? true;
      if (ok) {
        this.FOCUS(el, params);
      }
      return;
    }
    if (isToken(el as Node)) {
      const htmlEl = el as HTMLElement;
      const ok =
        this.focusController?.({
          type: 'FOCUS_REQUEST',
          targetType: 'TOKEN',
          token: htmlEl,
          value: token.getValue(htmlEl)
        }) ?? true;
      if (ok) {
        this.FOCUS(htmlEl, params);
      }
    }
  }

  #SIB_HIGHLIGHT_CLEAR(): void {
    for (const sib of this.doc.SIB_HIGHLIGHT) {
      sib.classList.remove(SBR_FOCUS_SIBLING);
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
      next.classList.add(SBR_FOCUS_SIBLING);
      this.doc.SIB_HIGHLIGHT.add(next);
    }
    if (prev) {
      prev.classList.add(SBR_FOCUS_SIBLING);
      this.doc.SIB_HIGHLIGHT.add(prev);
    }
  }
}
