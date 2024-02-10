import { JsedDocument } from '../types';
import { JSED_FOCUS_CLASS, SBR_FOCUS_SIBLING } from './constants';
import { ignoreDescendents, isFocusable, notIsFocusable } from './focus';
import * as token from './token';
import {
  getNextSiblingNode,
  getParent,
  getPreviousSiblingNode,
  findNextNode,
  findPreviousNode,
} from './walk';

export class DocumentAction {
  #document: Omit<JsedDocument, 'actions'>;
  /**
   * The focus F_ELEM .  If a TOKEN is focused, this will be set to the parent
   * F_ELEM for that TOKEN.
   */
  #FOCUS?: HTMLElement;
  constructor(doc: Omit<JsedDocument, 'actions'>) {
    this.#document = doc;
  }
  /**
   * Find next using depth first recursion.
   */
  REC_NEXT(): HTMLElement | void {
    if (!this.#FOCUS) return;
    for (const next of findNextNode(this.#FOCUS, this.#document.root, {
      ignore: notIsFocusable,
      ignoreDescendents,
    })) {
      this.FOCUS(next);
      return next as HTMLElement;
    }
  }

  /**
   * Find previous using depth first recursion.
   */
  REC_PREV(): HTMLElement | void {
    if (!this.#FOCUS) return;
    debugger;
    for (const next of findPreviousNode(this.#FOCUS, this.#document.root, {
      ignore: notIsFocusable,
      ignoreDescendents,
    })) {
      this.FOCUS(next);
      return next as HTMLElement;
    }
  }

  /**
   * Find next sibling element if there is one.
   */
  SIB_NEXT(): void {
    if (!this.#FOCUS) return;
    const next = getNextSiblingNode(this.#FOCUS, {
      ignore: notIsFocusable,
      ignoreDescendents,
    });
    if (next) {
      this.FOCUS(next);
    }
    return;
  }

  /**
   * Find previous sibling element if there is one.
   */
  SIB_PREV(): void {
    if (!this.#FOCUS) return;
    const next = getPreviousSiblingNode(this.#FOCUS, {
      ignore: notIsFocusable,
      ignoreDescendents,
    });
    if (next) {
      this.FOCUS(next);
    }
    return;
  }

  /**
   * Find next parent.
   */
  UP(): void {
    if (!this.#FOCUS) return;
    const next = getParent(this.#FOCUS, this.#document.root);
    if (next) {
      this.FOCUS(next);
    }
    return;
  }

  #updateFocus(el: HTMLElement) {
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
   * Focus an element if it is an F_ELEM, sets doc.active.
   *
   * TOKEN_FOCUS is checked first.
   *
   * TODO: doc.active should update.  Should we track it manually?
   */
  FOCUS(el: Element | EventTarget | null): void {
    if (token.isToken2(el) && this.#document.listeners.FOCUS) {
      this.#document.listeners.FOCUS({
        type: 'FOCUS',
        targetType: 'TOKEN',
        token: el,
        value: token.getValue(el),
      });
      // Update the F_ELEM that contains the TOKEN.
      this.#updateFocus(el.parentNode as HTMLElement);
      return;
    } else if (!isFocusable(el)) {
      return;
    }
    if (this.#document.listeners.FOCUS) {
      const ok = this.#document.listeners.FOCUS({
        type: 'FOCUS',
        targetType: 'F_ELEM',
      });
      if (ok) {
        this.#updateFocus(el);
      }
      if (!ok) {
        return;
      }
    }
    token.tokenize(el, this.#document.tokenized);
    this.SIB_HIGHLIGHT();
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
