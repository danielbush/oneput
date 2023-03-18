import { SBR_FOCUS_SIBLING } from './constants';
import { DocumentContext } from './DocumentContext';
import { isFocusable } from './focus';
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
    next.focus();
    break;
  }
}

/**
 * Find previous using depth first recursion.
 */
export function REC_PREV(cx: DocumentContext): void {
  if (!cx.active) return;
  for (const next of walkIterReverse(cx.active, cx.root)) {
    next.focus();
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
    next.focus();
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
    next.focus();
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
    next.focus();
  }
  return;
}

/**
 * Focus an element, sets cx.active.
 *
 * TODO: cx.active should update.  Should we track it manually?
 */
export function FOCUS(
  cx: DocumentContext,
  el: Element | EventTarget | null,
): boolean {
  if (!isFocusable(el)) {
    return false;
  }
  el.focus();
  return true;
}

export function SIB_HIGHLIGHT_CLEAR(cx: DocumentContext): void {
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
