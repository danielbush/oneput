import { getCurrentFocus } from './focus';
import {
  getNextSiblingElement,
  getPreviousSiblingElement,
  walkIter,
  walkIterReverse,
} from './walk';

export type ActionContext = {
  root: HTMLElement;
};

/**
 * Find next using deptth first recursion.
 */
export function REC_NEXT(cx: ActionContext): void {
  const active = getCurrentFocus();
  if (!active) return;
  for (const next of walkIter(active, cx.root)) {
    next.focus();
    break;
  }
}
export function REC_PREV(cx: ActionContext): void {
  const active = getCurrentFocus();
  if (!active) return;
  for (const next of walkIterReverse(active, cx.root)) {
    next.focus();
    break;
  }
}

export function SIB_NEXT(): void {
  const active = getCurrentFocus();
  if (!active) return;
  const next = getNextSiblingElement(active);
  if (next) {
    next.focus();
  }
  return;
}

export function SIB_PREV(): void {
  const active = getCurrentFocus();
  if (!active) return;
  const next = getPreviousSiblingElement(active);
  if (next) {
    next.focus();
  }
  return;
}
