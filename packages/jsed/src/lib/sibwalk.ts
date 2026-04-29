/**
 * Sibling helpers, LINE detection, and LINE_SIBLING traversal.
 *
 * Classification predicates (`is*`) live in taxonomy.ts. This module
 * imports from taxonomy.ts and adds traversal logic on top.
 */

import { JSED_SELECTION_CLASS } from './constants.js';
import {
  isCursorTransparent,
  isIgnorable,
  isIgnorableNode,
  isIsland,
  isLine,
  isLineSibling,
  isToken,
  isTokenizableTextNode
} from './taxonomy.js';
import { findNextNode, findPreviousNode } from './walk.js';

/**
 * Does `el` contain any SELECTION_WRAPPER? Used by the detokenizer's
 * keep-alive predicate so LINEs hosting an active selection are not
 * detokenized underneath TokenSelection's references.
 *
 * Lives here for now but may move if it grows a wider audience.
 */
export function containsSelection(el: HTMLElement): boolean {
  return el.querySelector(`.${JSED_SELECTION_CLASS}`) !== null;
}

/**
 * Get previous visible (non-IGNORABLE) element sibling.
 * Walks backwards skipping IGNORABLE's. Returns null if none found.
 */
export function getPreviousVisibleSibling(el: HTMLElement): HTMLElement | null {
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
export function getNextVisibleSibling(el: HTMLElement): HTMLElement | null {
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
  const prev = getPreviousVisibleSibling(el);
  if (isToken(prev)) {
    return prev;
  }
  return null;
}

/**
 * Similar to getPreviousTokenSibling but for the next SIBLING.
 */
export function getNextTokenSibling(el: HTMLElement): HTMLElement | null {
  const next = getNextVisibleSibling(el);
  if (isToken(next)) {
    return next;
  }
  return null;
}

/**
 * Find the LINE associated with `el`. Returns `el` itself if it is a LINE.
 *
 * Used by FOCUS-level code (Nav). CURSOR-level code should use an explicitly
 * stored LINE rather than calling this per-hop.
 */
export function getLine(el: Node): HTMLElement {
  if (!el) {
    throw new Error(`getLine: element is null`);
  }
  for (let p: Node | null = el; ; p = p?.parentNode) {
    if (!p) {
      throw new Error(`getLine: expected parentNode to exist`);
    }
    if (isLine(p)) {
      return p as HTMLElement;
    }
  }
  throw new Error(`getLine: end of for-loop`);
}

export function isSameLine(tok1: HTMLElement, tok2: HTMLElement): boolean {
  const line1 = getLine(tok1);
  const line2 = getLine(tok2);
  return line1 === line2;
}

/**
 * Get previous LINE_SIBLING within `line`.
 */
export function getPreviousLineSibling(el: Node, ceiling: HTMLElement): Node | null {
  for (const prev of findPreviousNode(el, ceiling, {
    descend: (node) => !isIsland(node) && !isToken(node) && !isIgnorable(node)
  })) {
    if (isIgnorableNode(prev)) {
      continue;
    }
    if (isTokenizableTextNode(prev)) {
      return prev;
    }
    if (isLineSibling(prev)) {
      return prev as HTMLElement;
    }
  }
  return null;
}

/**
 * Get next LINE_SIBLING from `el` within `line`.
 */
export function getNextLineSibling(el: Node, ceiling: HTMLElement): Node | null {
  for (const next of findNextNode(el, ceiling, {
    descend: (node) => !isIsland(node) && !isToken(node) && !isIgnorable(node)
  })) {
    if (isIgnorableNode(next)) {
      continue;
    }
    if (isTokenizableTextNode(next)) {
      return next;
    }
    if (isLineSibling(next)) {
      return next as HTMLElement;
    }
  }
  return null;
}

/**
 * Get the first LINE_SIBLING in a LINE.
 */
export function getFirstLineSibling(line: HTMLElement): HTMLElement | null {
  for (const node of findNextNode(line, line, {
    visit: isLineSibling,
    // Descend `line`.
    descend: (n) => n === line || isCursorTransparent(n)
  })) {
    return node as HTMLElement;
  }
  return null;
}

export function findNextEditableLine(from: Node, ceiling: HTMLElement): HTMLElement | null {
  const nextToken = getNextLineSibling(from, ceiling);
  const line = nextToken ? getLine(nextToken) : null;
  return line;
}
