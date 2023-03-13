import { DocumentContext, SBR_FOCUS_SIBLING } from '../document';
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

export function CLICK(cx: DocumentContext, el: HTMLElement): void {
  if (cx.TABS.has(el)) {
    el.focus();
    showCurrentSiblings(cx);
  }
}

export function clearCurrentSiblings(cx: DocumentContext): void {
  for (const sib of cx.SIB_FOCUS) {
    sib.classList.remove(SBR_FOCUS_SIBLING);
  }
  cx.SIB_FOCUS.clear();
}

export function showCurrentSiblings(cx: DocumentContext): void {
  clearCurrentSiblings(cx);
  const active = document.activeElement;
  const pnode = active?.parentElement;
  if (active && pnode && cx.TABS.has(active as HTMLElement)) {
    for (const child of pnode.children) {
      if (isFocusable(child)) {
        if (cx.TABS.has(child) && child !== active) {
          cx.SIB_FOCUS.add(child);
          child.classList.add(SBR_FOCUS_SIBLING);
        }
      }
    }
  }
}
