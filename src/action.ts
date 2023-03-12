import { DocumentContext } from './browser';
import { SBR_FOCUS_SIBLING } from './constants';
import { TABS } from './load';
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

export function CLICK(el: HTMLElement): void {
  if (TABS.has(el)) {
    el.focus();
    showCurrentSiblings();
  }
}

const SIB_FOCUS = new Set<Element>();

export function clearCurrentSiblings(): void {
  for (const sib of SIB_FOCUS) {
    sib.classList.remove(SBR_FOCUS_SIBLING);
  }
  SIB_FOCUS.clear();
}

export function showCurrentSiblings(): void {
  clearCurrentSiblings();
  const active = document.activeElement;
  const pnode = active?.parentElement;
  if (active && pnode && TABS.has(active as HTMLElement)) {
    for (const child of pnode.children) {
      if (TABS.has(child as HTMLElement) && child !== active) {
        SIB_FOCUS.add(child);
        child.classList.add(SBR_FOCUS_SIBLING);
      }
    }
  }
}
