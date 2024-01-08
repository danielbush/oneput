import { SBR_FOCUS_SIBLING } from './constants';
import type { DocumentContext } from './DocumentContext';
import { isFocusable } from './focus';
import { createToken, isToken } from './token';
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

/**
 * Apply TOKEN_FOCUS to focus a token and ensure FOCUS is set to the containing F_ELEM .
 * 
 * Send TOKEN_FOCUS first followed by the FOCUS for the parent.
 */
export function TOKEN_FOCUS(
  cx: DocumentContext,
  el: Element | EventTarget | null,
): boolean {
  if (!isToken(el)) {
    return false;
  }
  if (cx.listeners.TOKEN_FOCUS) {
    const ok = cx.listeners.TOKEN_FOCUS({
      type: 'FOCUS',
      targetType: 'TOKEN',
      parent: el.parentElement,
      value: el.innerText!,
      requestCursor: () => {
        return {
          onChange: (evt) => {
            console.log(evt);
          },
          movePrevious: () => {},
          moveNext: () => {},
          replace: () => {},
          delete: () => {},
          append: () => {},
          prepend: () => {},
          close: () => {},
        };
      },
    });
    if (!ok) {
      // Always focus the parent F_ELEM of the token.
      FOCUS(cx, el.parentNode);
      return false;
    }
  }
  if (cx.activeToken) {
    cx.activeToken.classList.remove('jsed-token-focus');
    cx.activeToken = null;
  }
  cx.activeToken = el;
  el.classList.add('jsed-token-focus');
  // Always focus the parent F_ELEM of the token.
  FOCUS(cx, el.parentNode);
  return true;
}

/**
 * Clean up an old TOKEN_FOCUS for situations where FOCUS is called on an unrelated F_ELEM.
 */
export function CLEAR_TOKEN_FOCUS(cx: DocumentContext) {
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
 * TODO: cx.active should update.  Should we track it manually?
 */
export function FOCUS(
  cx: DocumentContext,
  el: Element | EventTarget | null,
): boolean {
  // Attempt TOKEN_FOCUS first.  If true, then TOKEN_FOCUS will handle how we
  // focus from here.
  if (TOKEN_FOCUS(cx, el)) {
    return false;
  }
  if (!isFocusable(el)) {
    return false;
  }
  if (cx.listeners.FOCUS) {
    const ok = cx.listeners.FOCUS({ type: 'FOCUS', targetType: 'F_ELEM' });
    if (!ok) {
      return false;
    }
  }
  if (cx.active) {
    cx.active.classList.remove('jsed-focus');
  }
  el.classList.add('jsed-focus');
  cx.active = el as HTMLElement;
  CLEAR_TOKEN_FOCUS(cx);
  TOKENIZE(cx, el);
  SIB_HIGHLIGHT(cx);
  SCROLL_INTO_VIEW(cx);
  return true;
}

export function SCROLL_INTO_VIEW(cx: DocumentContext): void {
  if (!cx.active) return;
  const window = cx.document.defaultView;
  if (!window) return;
  const rect = cx.active.getBoundingClientRect();
  if (rect.y < 0) {
    cx.active.scrollIntoView(true);
  } else {
    const elemBottom = rect.y + rect.height;
    if (elemBottom > window.visualViewport?.height!) {
      cx.active.scrollIntoView(true);
    }
  }
}

/**
 * Tokenize the text of an F_ELEM.
 */
export function TOKENIZE(cx: DocumentContext, el: HTMLElement): void {
  if (!cx.tokenized.has(el)) {
    cx.tokenized.set(el, true);
    if (el.innerText && el.innerText.length > 0) {
      el.normalize();
      const first = el.firstChild;
      if (first?.nodeType === Node.TEXT_NODE) {
        const tokens = first
          .nodeValue!.split(/\s+/)
          .filter(Boolean)
          .map((s) => createToken(s));
        const frag = document.createDocumentFragment();
        for (const token of tokens) {
          frag.appendChild(token);
          frag.appendChild(document.createTextNode(' '));
        }
        el.insertBefore(frag, first);
        el.removeChild(first);
      }
    }
  }
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
