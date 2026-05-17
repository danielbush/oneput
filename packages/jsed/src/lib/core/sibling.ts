/**
 * Sibling helpers, LINE detection, and LINE_SIBLING traversal.
 *
 * Classification predicates (`is*`) live in taxonomy.ts. This module
 * imports from taxonomy.ts and adds traversal logic on top.
 */

import { isIgnorable, isToken } from './taxonomy.js';
import { shouldVisit, type Walk2Params } from './walk.js';

export function getNextSibling(start: Node, ceiling: Node, params?: Walk2Params): Node | null {
  if (start === ceiling) {
    return null;
  }
  let next: Node | null | undefined = start;
  for (;;) {
    next = next?.nextSibling;
    if (!next) {
      break;
    }
    if (shouldVisit(next, params)) {
      return next;
    }
  }
  return null;
}

export function getPreviousSibling(start: Node, ceiling: Node, params?: Walk2Params): Node | null {
  if (start === ceiling) {
    return null;
  }
  let prev: Node | null | undefined = start;
  for (;;) {
    prev = prev?.previousSibling;
    if (!prev) {
      break;
    }
    if (shouldVisit(prev, params)) {
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
