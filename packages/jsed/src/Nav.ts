import type { JsedDocument, JsedFocusEvent, JsedFocusRequestEvent } from './types.js';
import { JSED_DOM_ROOT_ID, JSED_FOCUS_CLASS, SBR_FOCUS_SIBLING } from './lib/constants.js';
import { isIsland, isFocusable } from './lib/focus.js';
import * as token from './lib/token.js';
import {
  getNextSiblingNode,
  getParent,
  getPreviousSiblingNode,
  findNextNode,
  findPreviousNode
} from './lib/walk.js';
import { ElementIndicator } from './ElementIndicator.js';

export type NavError =
  | { type: 'no-token-under-focus' }
  | {
      /**
       * TODO: should we ever let this happen?
       */
      type: 'no-focus';
    };

/**
 * Manages the FOCUS .
 */
export class Nav {
  static create(doc: JsedDocument): Nav {
    const elementIndicator = ElementIndicator.create();
    return new Nav(doc, elementIndicator);
  }

  static createNull(doc: JsedDocument): Nav {
    const elementIndicator = ElementIndicator.createNull();
    return new Nav(doc, elementIndicator);
  }

  /**
   * The focus FOCUSABLE .  If a TOKEN is focused, this will be set to the parent
   * FOCUSABLE for that TOKEN.
   */
  #FOCUS?: HTMLElement;
  #REQUEST_FOCUS?: ((evt: JsedFocusRequestEvent) => boolean) | null;

  get document(): JsedDocument {
    return this.doc;
  }

  constructor(
    private doc: JsedDocument,
    private elementIndicator: ElementIndicator
  ) {
    // doc.root.addEventListener<'click'>('click', this.handleElementClick);
    doc.root.addEventListener<'mousedown'>('mousedown', this.handleElementClick);
    this.FOCUS(doc.root);
    const focus = this.getFocus();
    elementIndicator.updateFocus(focus);
    elementIndicator.showIndicator(true);
  }

  close() {
    this.doc.root.removeEventListener('click', this.handleElementClick);
  }

  /**
   * This can control whether or not a FOCUS can occur.
   *
   * Don't forget to remove it at the end.
   * TOOO: need a better clean up pattern
   * @param controller
   */
  setFocusController(controller: (evt: JsedFocusRequestEvent) => boolean) {
    console.warn('set focus controller');
    this.#REQUEST_FOCUS = controller;
  }

  removeFocusController() {
    console.warn('remove focus controller');
    this.#REQUEST_FOCUS = null;
  }

  handleElementClick = (evt: MouseEvent) => {
    const app_root_node = document.getElementById(JSED_DOM_ROOT_ID);
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

  #emitFocusEvent(_evt: JsedFocusEvent) {
    // console.warn('TODO: emit FOCUS event', evt);
  }

  #updateFocus(el: HTMLElement) {
    let tok: HTMLElement | null = null;
    if (token.isToken(el)) {
      tok = el;
      el = token.getParent(el);
    }
    if (!isFocusable(el)) {
      throw new Error('#updateFocus: expects an FOCUSABLE');
    }
    if (this.#FOCUS) {
      this.#FOCUS.classList.remove(JSED_FOCUS_CLASS);
    }
    this.#FOCUS = el;
    this.elementIndicator.updateFocus(el);
    this.#FOCUS.classList.add(JSED_FOCUS_CLASS);
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
  REC_NEXT(): HTMLElement | null {
    if (!this.#FOCUS) return null;
    for (const next of findNextNode(this.#FOCUS, this.doc.root, {
      filter: isFocusable,
      ignoreDescendents: isIsland
    })) {
      this.REQUEST_FOCUS(next);
      return next as HTMLElement;
    }
    return null;
  }

  /**
   * Find previous using depth first recursion.
   */
  REC_PREV(): HTMLElement | null {
    if (!this.#FOCUS) return null;
    for (const next of findPreviousNode(this.#FOCUS, this.doc.root, {
      filter: isFocusable,
      ignoreDescendents: isIsland
    })) {
      this.REQUEST_FOCUS(next);
      return next as HTMLElement;
    }
    return null;
  }

  /**
   * Find next sibling element if there is one.
   */
  SIB_NEXT(): HTMLElement | null {
    if (!this.#FOCUS) return null;
    const next = getNextSiblingNode(this.#FOCUS, {
      filter: isFocusable,
      ignoreDescendents: isIsland
    });
    if (next) {
      this.REQUEST_FOCUS(next);
      return next as HTMLElement;
    }
    return null;
  }

  /**
   * Find previous sibling element if there is one.
   */
  SIB_PREV(): HTMLElement | null {
    if (!this.#FOCUS) return null;
    const next = getPreviousSiblingNode(this.#FOCUS, {
      filter: isFocusable,
      ignoreDescendents: isIsland
    });
    if (next) {
      this.REQUEST_FOCUS(next);
      return next as HTMLElement;
    }
    return null;
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
  FOCUS(el: HTMLElement): void {
    this.#updateFocus(el);
    this.SIB_HIGHLIGHT();
  }

  /**
   * Request FOCUS for an element `el`, if request is allow, focus and EMIT a
   * FOCUS event.
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
        this.#REQUEST_FOCUS?.({
          type: 'FOCUS_REQUEST',
          targetType: 'FOCUSABLE',
          element: el
        }) ?? true;
      if (ok) {
        this.FOCUS(el);
      }
      return;
    }
    if (token.isToken2(el)) {
      const ok =
        this.#REQUEST_FOCUS?.({
          type: 'FOCUS_REQUEST',
          targetType: 'TOKEN',
          token: el,
          value: token.getValue(el)
        }) ?? true;
      if (ok) {
        this.FOCUS(el);
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
    const pnode = active?.parentElement;
    if (active && pnode && isFocusable(active)) {
      for (const child of pnode.children) {
        if (isFocusable(child)) {
          if (child !== active) {
            this.doc.SIB_HIGHLIGHT.add(child);
            child.classList.add(SBR_FOCUS_SIBLING);
          }
        }
      }
    }
  }
}
