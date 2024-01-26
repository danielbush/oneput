import { SBR_FOCUS_SIBLING } from './constants';
import type { JsedDocument } from '../app/document';
import { isFocusable } from './focus';
import * as token from './token';
import {
  getNextSiblingElement,
  getParent,
  getPreviousSiblingElement,
  walkIter,
  walkIterReverse,
} from './walk';

export class DocumentAction {
  #document: Omit<JsedDocument, 'actions'>;
  constructor(doc: Omit<JsedDocument, 'actions'>) {
    this.#document = doc;
  }
  /**
   * Find next using depth first recursion.
   */
  REC_NEXT(): void {
    if (!this.#document.active) return;
    for (const next of walkIter(this.#document.active, this.#document.root)) {
      this.FOCUS(next);
      break;
    }
  }

  /**
   * Find previous using depth first recursion.
   */
  REC_PREV(): void {
    if (!this.#document.active) return;
    for (const next of walkIterReverse(
      this.#document.active,
      this.#document.root,
    )) {
      this.FOCUS(next);
      break;
    }
  }

  /**
   * Find next sibling element if there is one.
   */
  SIB_NEXT(): void {
    if (!this.#document.active) return;
    const next = getNextSiblingElement(this.#document.active);
    if (next) {
      this.FOCUS(next);
    }
    return;
  }

  /**
   * Find previous sibling element if there is one.
   */
  SIB_PREV(): void {
    if (!this.#document.active) return;
    const next = getPreviousSiblingElement(this.#document.active);
    if (next) {
      this.FOCUS(next);
    }
    return;
  }

  /**
   * Find next parent.
   */
  UP(): void {
    if (!this.#document.active) return;
    const next = getParent(this.#document.active, this.#document.root);
    if (next) {
      this.FOCUS(next);
    }
    return;
  }

  /**
   * Determine if TOKEN_FOCUS is applicable to the element and if so (1) focus the parent F_ELEM adn (2) determine if the listener wants to do a TOKEN_FOCUS.
   */
  TOKEN_FOCUS(
    el: HTMLElement,
    params: {
      replaced: boolean;
    } = { replaced: false },
  ): void {
    let ok = false;
    if (this.#document.listeners.TOKEN_FOCUS) {
      ok = this.#document.listeners.TOKEN_FOCUS({
        type: 'FOCUS',
        targetType: 'TOKEN',
        parent: el.parentElement,
        value: el.innerText!,
        replaced: params.replaced,
      });
    }
    if (ok) {
      if (this.#document.activeToken) {
        this.#document.activeToken.classList.remove('jsed-token-focus');
        this.#document.activeToken = null;
      }
      this.#document.activeToken = el;
      el.classList.add('jsed-token-focus');
    }
  }

  /**
   * Clean up an old TOKEN_FOCUS for situations where FOCUS is called on an unrelated F_ELEM.
   */
  CLEAR_TOKEN_FOCUS() {
    if (this.#document.activeToken) {
      if (this.#document.activeToken.parentNode !== this.#document.active) {
        this.#document.activeToken.classList.remove('jsed-token-focus');
        this.#document.activeToken = null;
      }
    }
  }

  /**
   * Focus an element if it is an F_ELEM, sets doc.active.
   *
   * TOKEN_FOCUS is checked first.
   *
   * TODO: doc.active should update.  Should we track it manually?
   */
  FOCUS(
    el: Element | EventTarget | null,
    params?: { skipNotify?: boolean; replaced?: boolean },
  ): void {
    if (token.isToken(el)) {
      this.TOKEN_FOCUS(el, { replaced: !!params?.replaced });
      // Always focus the parent F_ELEM of the token.
      // Use skipNotify because we won't issue a FOCUS event.  The event generated
      // by the TOKEN_FOCUS contains all the information we need.
      this.FOCUS(el.parentNode, { skipNotify: true });
      return;
    }
    if (!isFocusable(el)) {
      return;
    }
    if (this.#document.listeners.FOCUS && !params?.skipNotify) {
      const ok = this.#document.listeners.FOCUS({
        type: 'FOCUS',
        targetType: 'F_ELEM',
      });
      if (!ok) {
        return;
      }
    }
    if (this.#document.active) {
      this.#document.active.classList.remove('jsed-focus');
    }
    el.classList.add('jsed-focus');
    this.#document.active = el as HTMLElement;
    this.CLEAR_TOKEN_FOCUS();
    if (!this.#document.tokenized.has(el)) {
      this.#document.tokenized.set(el, true);
      token.tokenize(el);
    }
    this.SIB_HIGHLIGHT();
  }

  SIB_HIGHLIGHT_CLEAR(): void {
    for (const sib of this.#document.SIB_HIGHLIGHT) {
      sib.classList.remove(SBR_FOCUS_SIBLING);
    }
    this.#document.SIB_HIGHLIGHT.clear();
  }

  /**
   * Highlight siblings of currently focused element.
   */
  SIB_HIGHLIGHT(): void {
    this.SIB_HIGHLIGHT_CLEAR();
    const active = this.#document.active;
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
