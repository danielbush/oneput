import { SBR_FOCUS_SIBLING } from './constants';
import type { DocumentContext, IJsedCursor } from './DocumentContext';
import { isFocusable } from './focus';
import * as token from './token';
import {
  getNextSiblingElement,
  getParent,
  getPreviousSiblingElement,
  walkIter,
  walkIterReverse,
} from './walk';

/**
 * Find next using depth first recursion.
 */
export function REC_NEXT(cx: DocumentContext): void {
  if (!cx.active) return;
  for (const next of walkIter(cx.active, cx.root)) {
    FOCUS(cx, next);
    break;
  }
}

/**
 * Find previous using depth first recursion.
 */
export function REC_PREV(cx: DocumentContext): void {
  if (!cx.active) return;
  for (const next of walkIterReverse(cx.active, cx.root)) {
    FOCUS(cx, next);
    break;
  }
}

/**
 * Find next sibling element if there is one.
 */
export function SIB_NEXT(cx: DocumentContext): void {
  if (!cx.active) return;
  const next = getNextSiblingElement(cx.active);
  if (next) {
    FOCUS(cx, next);
  }
  return;
}

/**
 * Find previous sibling element if there is one.
 */
export function SIB_PREV(cx: DocumentContext): void {
  if (!cx.active) return;
  const next = getPreviousSiblingElement(cx.active);
  if (next) {
    FOCUS(cx, next);
  }
  return;
}

/**
 * Find next parent.
 */
export function UP(cx: DocumentContext): void {
  if (!cx.active) return;
  const next = getParent(cx.active, cx.root);
  if (next) {
    FOCUS(cx, next);
  }
  return;
}
class JsedCursor implements IJsedCursor {
  #context: DocumentContext;
  constructor(params: { context: DocumentContext }) {
    this.#context = params.context;
  }
  #getActiveTokenOrDie(): HTMLElement {
    if (this.#context.activeToken) {
      return this.#context.activeToken;
    }
    const err = new Error('activeToken not set');
    throw err;
  }
  moveNext() {
    if (!this.#context.activeToken) {
      return;
    }
    const prevToken = token.getNextSibling(this.#context.activeToken);
    if (prevToken) {
      TOKEN_FOCUS(this.#context, prevToken);
    }
  }
  movePrevious() {
    if (!this.#context.activeToken) {
      return;
    }
    const prevToken = token.getPreviousSibling(this.#context.activeToken);
    if (prevToken) {
      TOKEN_FOCUS(this.#context, prevToken);
    }
  }
  replace(val: string) {
    const tok = this.#getActiveTokenOrDie();
    token.replaceText(tok, val);
  }
  delete() {}
  append(val: string): HTMLElement {
    const tok = token.createToken(val);
    token.insertAfter(tok, this.#getActiveTokenOrDie());
    return tok;
  }
  focus(el: HTMLElement): boolean {
    if (token.isToken(el)) {
      TOKEN_FOCUS(this.#context, el);
      return true;
    }
    return false;
  }
  prepend() {}
  close() {}
}

/**
 * Determine if TOKEN_FOCUS is applicable to the element and if so (1) focus the parent F_ELEM adn (2) determine if the listener wants to do a TOKEN_FOCUS.
 */
function TOKEN_FOCUS(cx: DocumentContext, el: HTMLElement): void {
  let ok = false;
  if (cx.listeners.TOKEN_FOCUS) {
    ok = cx.listeners.TOKEN_FOCUS({
      type: 'FOCUS',
      targetType: 'TOKEN',
      parent: el.parentElement,
      value: el.innerText!,
      requestCursor: () => {
        return new JsedCursor({ context: cx });
      },
    });
  }
  if (ok) {
    if (cx.activeToken) {
      cx.activeToken.classList.remove('jsed-token-focus');
      cx.activeToken = null;
    }
    cx.activeToken = el;
    el.classList.add('jsed-token-focus');
  }
}

/**
 * Clean up an old TOKEN_FOCUS for situations where FOCUS is called on an unrelated F_ELEM.
 */
function CLEAR_TOKEN_FOCUS(cx: DocumentContext) {
  if (cx.activeToken) {
    if (cx.activeToken.parentNode !== cx.active) {
      cx.activeToken.classList.remove('jsed-token-focus');
      cx.activeToken = null;
    }
  }
}

/**
 * Focus an element if it is an F_ELEM, sets cx.active.
 *
 * TOKEN_FOCUS is checked first.
 *
 * TODO: cx.active should update.  Should we track it manually?
 */
export function FOCUS(
  cx: DocumentContext,
  el: Element | EventTarget | null,
  params?: { skipNotify: boolean },
): void {
  if (token.isToken(el)) {
    TOKEN_FOCUS(cx, el);
    // Always focus the parent F_ELEM of the token.
    // Use skipNotify because we won't issue a FOCUS event.  The event generated
    // by the TOKEN_FOCUS contains all the information we need.
    FOCUS(cx, el.parentNode, { skipNotify: true });
    return;
  }
  if (!isFocusable(el)) {
    return;
  }
  if (cx.listeners.FOCUS && !params?.skipNotify) {
    const ok = cx.listeners.FOCUS({ type: 'FOCUS', targetType: 'F_ELEM' });
    if (!ok) {
      return;
    }
  }
  if (cx.active) {
    cx.active.classList.remove('jsed-focus');
  }
  el.classList.add('jsed-focus');
  cx.active = el as HTMLElement;
  CLEAR_TOKEN_FOCUS(cx);
  if (!cx.tokenized.has(el)) {
    cx.tokenized.set(el, true);
    token.tokenize(el);
  }
  SIB_HIGHLIGHT(cx);
}

function SIB_HIGHLIGHT_CLEAR(cx: DocumentContext): void {
  for (const sib of cx.SIB_HIGHLIGHT) {
    sib.classList.remove(SBR_FOCUS_SIBLING);
  }
  cx.SIB_HIGHLIGHT.clear();
}

/**
 * Highlight siblings of currently focused element.
 */
export function SIB_HIGHLIGHT(cx: DocumentContext): void {
  SIB_HIGHLIGHT_CLEAR(cx);
  const active = cx.active;
  const pnode = active?.parentElement;
  if (active && pnode && cx.TABS.has(active)) {
    for (const child of pnode.children) {
      if (isFocusable(child)) {
        if (cx.TABS.has(child) && child !== active) {
          cx.SIB_HIGHLIGHT.add(child);
          child.classList.add(SBR_FOCUS_SIBLING);
        }
      }
    }
  }
}
