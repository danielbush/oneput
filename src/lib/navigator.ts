import { JsedDocument } from '../types';
import { JSED_FOCUS_CLASS, SBR_FOCUS_SIBLING } from './constants';
import { ignoreDescendents, isFocusable } from './focus';
import * as token from './token';
import {
  getNextSiblingNode,
  getParent,
  getPreviousSiblingNode,
  findNextNode,
  findPreviousNode,
} from './walk';

export class Navigator {
  #document: Omit<JsedDocument, 'nav'>;
  /**
   * The focus F_ELEM .  If a TOKEN is focused, this will be set to the parent
   * F_ELEM for that TOKEN.
   */
  #FOCUS?: HTMLElement;
  constructor(doc: Omit<JsedDocument, 'nav'>) {
    this.#document = doc;
  }

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
    if (token.isToken(el)) {
      el = token.getParent(el);
    }
    if (!isFocusable(el)) {
      throw new Error('#updateFocus: expects an F_ELEM');
    }
    if (this.#FOCUS) {
      this.#FOCUS.classList.remove(JSED_FOCUS_CLASS);
    }
    this.#FOCUS = el;
    this.#FOCUS.classList.add(JSED_FOCUS_CLASS);
  }

  /**
   * Find next using depth first recursion.
   */
  REC_NEXT(): HTMLElement | null {
    if (!this.#FOCUS) return null;
    for (const next of findNextNode(this.#FOCUS, this.#document.root, {
      filter: isFocusable,
      ignoreDescendents,
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
    for (const next of findPreviousNode(this.#FOCUS, this.#document.root, {
      filter: isFocusable,
      ignoreDescendents,
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
      ignoreDescendents,
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
      ignoreDescendents,
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
    const next = getParent(this.#FOCUS, this.#document.root);
    if (next) {
      this.REQUEST_FOCUS(next);
    }
    return;
  }

  /**
   * Focus an element if it is an F_ELEM .
   */
  FOCUS(el: HTMLElement): void {
    this.#updateFocus(el);
    this.SIB_HIGHLIGHT();
  }

  /**
   * Request FOCUS for an element `el`.
   *
   * TOKEN_FOCUS is checked first.
   *
   * The FOCUS listener will be called and its response checked to determine if
   * the FOCUS will occur or not.
   *
   * This can be called by something outside of the listener that is registered
   * to document.listeners.FOCUS .   The listener is probably some sort of
   * editor that controls the focus and cursor and it can decide to accept or
   * reject the focus request.  This editor will usually call FOCUS directly.
   *
   */
  REQUEST_FOCUS(el: Element | EventTarget | null): void {
    if (!el) {
      return;
    }
    // If there are no listeners, we'll assume ok = true.
    const listener = this.#document.listeners.REQUEST_FOCUS ?? (() => true);
    if (isFocusable(el)) {
      const ok = listener({
        type: 'FOCUS',
        targetType: 'F_ELEM',
        element: el,
      });
      if (ok) {
        token.tokenize(el);
        this.#updateFocus(el);
        this.SIB_HIGHLIGHT();
      }
      this.FOCUS(el);
      return;
    }
    if (token.isToken2(el)) {
      const ok = listener({
        type: 'FOCUS',
        targetType: 'TOKEN',
        token: el,
        value: token.getValue(el),
      });
      if (ok) {
        this.FOCUS(el);
      }
    }
  }

  #SIB_HIGHLIGHT_CLEAR(): void {
    for (const sib of this.#document.SIB_HIGHLIGHT) {
      sib.classList.remove(SBR_FOCUS_SIBLING);
    }
    this.#document.SIB_HIGHLIGHT.clear();
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
            this.#document.SIB_HIGHLIGHT.add(child);
            child.classList.add(SBR_FOCUS_SIBLING);
          }
        }
      }
    }
  }
}
