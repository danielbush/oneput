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

/**
 * Find next using depth first recursion.
 */
export function REC_NEXT(doc: JsedDocument): void {
  if (!doc.active) return;
  for (const next of walkIter(doc.active, doc.root)) {
    FOCUS(doc, next);
    break;
  }
}

/**
 * Find previous using depth first recursion.
 */
export function REC_PREV(doc: JsedDocument): void {
  if (!doc.active) return;
  for (const next of walkIterReverse(doc.active, doc.root)) {
    FOCUS(doc, next);
    break;
  }
}

/**
 * Find next sibling element if there is one.
 */
export function SIB_NEXT(doc: JsedDocument): void {
  if (!doc.active) return;
  const next = getNextSiblingElement(doc.active);
  if (next) {
    FOCUS(doc, next);
  }
  return;
}

/**
 * Find previous sibling element if there is one.
 */
export function SIB_PREV(doc: JsedDocument): void {
  if (!doc.active) return;
  const next = getPreviousSiblingElement(doc.active);
  if (next) {
    FOCUS(doc, next);
  }
  return;
}

/**
 * Find next parent.
 */
export function UP(doc: JsedDocument): void {
  if (!doc.active) return;
  const next = getParent(doc.active, doc.root);
  if (next) {
    FOCUS(doc, next);
  }
  return;
}

/**
 * Determine if TOKEN_FOCUS is applicable to the element and if so (1) focus the parent F_ELEM adn (2) determine if the listener wants to do a TOKEN_FOCUS.
 */
function TOKEN_FOCUS(
  doc: JsedDocument,
  el: HTMLElement,
  params: {
    replaced: boolean;
  } = { replaced: false },
): void {
  let ok = false;
  if (doc.listeners.TOKEN_FOCUS) {
    ok = doc.listeners.TOKEN_FOCUS({
      type: 'FOCUS',
      targetType: 'TOKEN',
      parent: el.parentElement,
      value: el.innerText!,
      replaced: params.replaced,
    });
  }
  if (ok) {
    if (doc.activeToken) {
      doc.activeToken.classList.remove('jsed-token-focus');
      doc.activeToken = null;
    }
    doc.activeToken = el;
    el.classList.add('jsed-token-focus');
  }
}

/**
 * Clean up an old TOKEN_FOCUS for situations where FOCUS is called on an unrelated F_ELEM.
 */
function CLEAR_TOKEN_FOCUS(doc: JsedDocument) {
  if (doc.activeToken) {
    if (doc.activeToken.parentNode !== doc.active) {
      doc.activeToken.classList.remove('jsed-token-focus');
      doc.activeToken = null;
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
export function FOCUS(
  doc: JsedDocument,
  el: Element | EventTarget | null,
  params?: { skipNotify?: boolean; replaced?: boolean },
): void {
  if (token.isToken(el)) {
    TOKEN_FOCUS(doc, el, { replaced: !!params?.replaced });
    // Always focus the parent F_ELEM of the token.
    // Use skipNotify because we won't issue a FOCUS event.  The event generated
    // by the TOKEN_FOCUS contains all the information we need.
    FOCUS(doc, el.parentNode, { skipNotify: true });
    return;
  }
  if (!isFocusable(el)) {
    return;
  }
  if (doc.listeners.FOCUS && !params?.skipNotify) {
    const ok = doc.listeners.FOCUS({ type: 'FOCUS', targetType: 'F_ELEM' });
    if (!ok) {
      return;
    }
  }
  if (doc.active) {
    doc.active.classList.remove('jsed-focus');
  }
  el.classList.add('jsed-focus');
  doc.active = el as HTMLElement;
  CLEAR_TOKEN_FOCUS(doc);
  if (!doc.tokenized.has(el)) {
    doc.tokenized.set(el, true);
    token.tokenize(el);
  }
  SIB_HIGHLIGHT(doc);
}

function SIB_HIGHLIGHT_CLEAR(doc: JsedDocument): void {
  for (const sib of doc.SIB_HIGHLIGHT) {
    sib.classList.remove(SBR_FOCUS_SIBLING);
  }
  doc.SIB_HIGHLIGHT.clear();
}

/**
 * Highlight siblings of currently focused element.
 */
export function SIB_HIGHLIGHT(doc: JsedDocument): void {
  SIB_HIGHLIGHT_CLEAR(doc);
  const active = doc.active;
  const pnode = active?.parentElement;
  if (active && pnode && isFocusable(active)) {
    for (const child of pnode.children) {
      if (isFocusable(child)) {
        if (child !== active) {
          doc.SIB_HIGHLIGHT.add(child);
          child.classList.add(SBR_FOCUS_SIBLING);
        }
      }
    }
  }
}
