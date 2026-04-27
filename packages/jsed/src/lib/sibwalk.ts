/**
 * Sibling helpers, LINE detection, and LINE_SIBLING traversal.
 *
 * Classification predicates (`is*`) live in taxonomy.ts. This module
 * imports from taxonomy.ts and adds traversal logic on top.
 */

import { JSED_SELECTION_CLASS } from './constants.js';
import {
  isCursorTransparent,
  isFocusable,
  isIgnorable,
  isIsland,
  isLine,
  isLineSibling,
  isToken
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

export function getParentLine(el: Node): HTMLElement {
  if (!el.parentNode) {
    throw new Error(`getParentLine: parentNode is null`);
  }
  return getLine(el.parentNode);
}

export function isSameLine(tok1: HTMLElement, tok2: HTMLElement): boolean {
  const line1 = getLine(tok1);
  const line2 = getLine(tok2);
  return line1 === line2;
}

/**
 * Get previous LINE_SIBLING within `line`.
 */
export function getPreviousLineSibling(el: HTMLElement): HTMLElement | null {
  for (const prev of findPreviousNode(el, getParentLine(el), {
    visit: isLineSibling,
    descend: isCursorTransparent
  })) {
    return prev as HTMLElement;
  }
  return null;
}

/**
 * Get next LINE_SIBLING from `el` within `line`.
 */
export function getNextLineSibling(el: HTMLElement): HTMLElement | null {
  for (const next of findNextNode(el, getParentLine(el), {
    // visit: isLineSibling,
    // descend: isCursorTransparent
  })) {
    if (isLineSibling(el)) {
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

/**
 * Returns { line, rootLine } where `line` is a candidate line with a
 * LINE_SIBLING the CURSOR could sit on.  If `line` is null, no candidates were
 * found at or within `rootLine`.
 *
 * Pairs with:
 * - `findNextLineCandidate(from, root)` — find a LINE_SIBLING in a later LINE
 * - `findPreviousLineCandidate(from, root)` — find a LINE_SIBLING in an earlier LINE
 */
export function findLineCandidateAt(from: HTMLElement): {
  rootLine: HTMLElement;
  line: HTMLElement | null;
} {
  const rootLine = getLine(from);
  if (isCandidateLineSibling(from)) {
    return { rootLine, line: rootLine };
  }
  for (const node of findNextNode(from, rootLine, {
    visit: isCandidateLineSibling,
    descend: isFocusable
  })) {
    return { rootLine, line: getLine(node) };
  }
  return { rootLine, line: null };
}

/**
 * Detect a candidate/potential LINE_SIBLING — a non-whitespace text node,
 * TOKEN, or ISLAND.
 *
 * "Candidate" means: a node whose presence indicates a LINE worth tokenizing
 * or descending into. Used by `findLineCandidateAt` to locate the LINE under
 * a FOCUSABLE that the CURSOR could land in.
 */
function isCandidateLineSibling(node: Node | null): boolean {
  if (!node) return false;
  if (isToken(node) || isIsland(node)) return true;
  return node.nodeType === Node.TEXT_NODE && /\S/.test(node.textContent ?? '');
}
