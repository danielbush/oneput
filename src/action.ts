import { getCurrentFocus } from './focus';
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
