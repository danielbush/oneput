/**
 * Sibling helpers, LINE detection, and LINE_SIBLING traversal.
 *
 * Classification predicates (`is*`) live in taxonomy.ts and are re-exported
 * here for backward compatibility. This module adds traversal logic on top.
 */

export {
  isAlreadyFocusable,
  isIsland,
  isIgnorable,
  isFocusable,
  isToken,
  isAnchor,
  isInlineFlow,
  isImplicitLine,
  isLine,
  isCursorBoundary,
  isTransparentBlock,
  isLineSibling
} from './taxonomy.js';

import {
  isIgnorable,
  isFocusable,
  isIsland,
  isToken,
  isInlineFlow,
  isImplicitLine,
  isLine,
  isTransparentBlock,
  isLineSibling
} from './taxonomy.js';
import { findNextNode, findPreviousNode } from './walk2.js';

// #region Sibling helpers

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

// #endregion

// #region LINE detection and LINE_SIBLING traversal

/**
 * Find the LINE associated with `el`. Returns `el` itself if it is a LINE.
 *
 * Used by FOCUS-level code (Nav). CURSOR-level code should use an explicitly
 * stored LINE rather than calling this per-hop.
 */
export function getLine(el: ChildNode): HTMLElement {
  if (!el) {
    throw new Error(`getLine: element is null`);
  }
  for (let p: ParentNode | ChildNode | null = el; ; p = p?.parentNode) {
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

/** Options for LINE_SIBLING traversal functions. */
export type LineSiblingOptions = {
  /** Called before descending into a TRANSPARENT_BLOCK. Use for lazy tokenization. */
  onEnterBlockTransparent?: (el: HTMLElement) => void;
};

/** Build the descend predicate for LINE_SIBLING traversal. */
function lineSiblingDescend(options?: LineSiblingOptions): (n: ParentNode | ChildNode) => boolean {
  return (n) => {
    // INLINE: focusable, not island, not implicit-line, inline-flow display
    if (isFocusable(n) && !isIsland(n) && !isImplicitLine(n) && isInlineFlow(n)) return true;
    if (isTransparentBlock(n)) {
      options?.onEnterBlockTransparent?.(n as HTMLElement);
      return true;
    }
    return false;
  };
}

/**
 * Get previous LINE_SIBLING within `line`.
 */
export function getPreviousLineSibling(
  el: HTMLElement,
  line: HTMLElement,
  options?: LineSiblingOptions
): HTMLElement | null {
  for (const prev of findPreviousNode(el, line, {
    visit: isLineSibling,
    descend: lineSiblingDescend(options)
  })) {
    return prev as HTMLElement;
  }
  return null;
}

/**
 * Get next LINE_SIBLING within `line`.
 */
export function getNextLineSibling(
  el: HTMLElement,
  line: HTMLElement,
  options?: LineSiblingOptions
): HTMLElement | null {
  for (const next of findNextNode(el, line, {
    visit: isLineSibling,
    descend: lineSiblingDescend(options)
  })) {
    return next as HTMLElement;
  }
  return null;
}

/**
 * Get the first LINE_SIBLING in a LINE — may be a TOKEN or an ISLAND.
 */
export function getFirstLineSibling(
  line: HTMLElement,
  options?: LineSiblingOptions
): HTMLElement | null {
  const descendFn = lineSiblingDescend(options);
  for (const node of findNextNode(line, line, {
    visit: isLineSibling,
    descend: (n) => n === line || descendFn(n)
  })) {
    return node as HTMLElement;
  }
  return null;
}

// #endregion
