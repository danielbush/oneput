import { SBR_FOCUS_SIBLING } from './constants';
import { getCurrentFocus } from './focus';
import { TABS } from './load';
import {
  getNextSiblingElement,
  getParent,
  getPreviousSiblingElement,
  walkIter,
  walkIterReverse,
} from './walk';

export type ActionContext = {
  root: HTMLElement;
};

/**
 * Find next using depth first recursion.
 */
export function REC_NEXT(cx: ActionContext): void {
  const active = getCurrentFocus();
  if (!active) return;
  for (const next of walkIter(active, cx.root)) {
    next.focus();
    break;
  }
}

/**
 * Find previous using depth first recursion.
 */
export function REC_PREV(cx: ActionContext): void {
  const active = getCurrentFocus();
  if (!active) return;
  for (const next of walkIterReverse(active, cx.root)) {
    next.focus();
    break;
  }
}

/**
 * Find next sibling element if there is one.
 */
export function SIB_NEXT(): void {
  const active = getCurrentFocus();
  if (!active) return;
  const next = getNextSiblingElement(active);
  if (next) {
    next.focus();
  }
  return;
}

/**
 * Find previous sibling element if there is one.
 */
export function SIB_PREV(): void {
  const active = getCurrentFocus();
  if (!active) return;
  const next = getPreviousSiblingElement(active);
  if (next) {
    next.focus();
  }
  return;
}

/**
 * Find next parent.
 */
export function UP(cx: ActionContext): void {
  const active = getCurrentFocus();
  if (!active) return;
  const next = getParent(active, cx.root);
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
  if (active && pnode && TABS.has(active)) {
    for (const child of pnode.children) {
      if (TABS.has(child) && child !== active) {
        SIB_FOCUS.add(child);
        child.classList.add(SBR_FOCUS_SIBLING);
      }
    }
  }
}
