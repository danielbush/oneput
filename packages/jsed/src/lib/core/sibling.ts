/**
 * Sibling helpers - elements share the same parentNode.
 */

import { isIgnorable, isToken } from './taxonomy.js';

type Visit = (node: Node) => boolean;

export function getNextSibling(
  start: Node | null,
  visit?: Visit,
  includeStart = false
): Node | null {
  let next: Node | null | undefined = start;
  if (includeStart && start) {
    if (visit?.(start)) {
      return start;
    }
  }
  for (;;) {
    next = next?.nextSibling;
    if (!next) {
      break;
    }
    if (visit?.(next)) {
      return next;
    }
  }
  return null;
}

export function getPreviousSibling(
  start: Node | null,
  visit?: Visit,
  includeStart = false
): Node | null {
  let prev: Node | null | undefined = start;
  if (includeStart && start) {
    if (visit?.(start)) {
      return start;
    }
  }
  for (;;) {
    prev = prev?.previousSibling;
    if (!prev) {
      break;
    }
    if (visit?.(prev)) {
      return prev;
    }
  }
  return null;
}

export function getPreviousNodeSibling(el: Node): Node | null {
  let prev = el.previousSibling;
  while (prev && isIgnorable(prev)) {
    prev = prev.previousSibling;
  }
  return prev;
}

export function getNextNodeSibling(el: Node): Node | null {
  let next = el.nextSibling;
  while (next && isIgnorable(next)) {
    next = next.nextSibling;
  }
  return next;
}

/**
 * Get previous visible (non-IGNORABLE) element sibling.
 * Walks backwards skipping IGNORABLE's. Returns null if none found.
 */
export function getPreviousElementSibling(el: HTMLElement): HTMLElement | null {
  let prev = el.previousElementSibling;
  while (prev && isIgnorable(prev)) {
    prev = prev.previousElementSibling;
  }
  return (prev as HTMLElement) ?? null;
}

/**
 * Get next visible (non-IGNORABLE) element sibling.
 * Walks forward skipping IGNORABLE's. Returns null if none found.
 */
export function getNextElementSibling(el: HTMLElement): HTMLElement | null {
  let next = el.nextElementSibling as HTMLElement | null;
  while (next && isIgnorable(next)) {
    next = next.nextElementSibling as HTMLElement | null;
  }
  return next ?? null;
}

/**
 * Get the previous TOKEN SIBLING if there is one.  Siblings must be contiguous text tokens with NO intervening tags including inline tags.
 *
 * `el` may or may not be a TOKEN .  `el` might be an inline tag eg an em-tag.
 *
 * This is basically a souped up version of the DOM's
 * node.previousElementSibling.  We may need to handle undo and other weird
 * stuff, so we use a wrapper here.
 */
export function getPreviousTokenSibling(el: HTMLElement): HTMLElement | null {
  const prev = getPreviousElementSibling(el);
  if (isToken(prev)) {
    return prev;
  }
  return null;
}

/**
 * Similar to getPreviousTokenSibling but for the next SIBLING.
 */
export function getNextTokenSibling(el: HTMLElement): HTMLElement | null {
  const next = getNextElementSibling(el);
  if (isToken(next)) {
    return next;
  }
  return null;
}
