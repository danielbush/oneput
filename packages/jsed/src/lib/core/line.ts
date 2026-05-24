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
import { findNextNode as findNextNodeW2, findPreviousNode as findPreviousNodeW2 } from './walk2.js';

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
 * Get previous LINE_SIBLING in current LINE or in previous LINE.
 *
 * Original iterator-based implementation, kept for reference. The active
 * implementation is {@link getPreviousLineSibling}, built on walk2.
 */
export function getPreviousLineSiblingV1(el: Node, ceiling: HTMLElement): Node | null {
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
 * Get previous LINE_SIBLING in current LINE or in previous LINE.
 *
 * Walks backward from `el` within `ceiling`, descending into CURSOR-transparent
 * structure but not into ISLAND's, TOKEN's, or IGNORABLE's, and returns the first
 * reachable seat (a tokenizable text node or LINE_SIBLING), skipping IGNORABLE
 * nodes. Backward enumeration makes that first seat the nearest preceding one;
 * the pre/post phase is irrelevant for seat-finding (seats are leaves, the
 * containers walked through are never seats).
 */
export function getPreviousLineSibling(el: Node, ceiling: HTMLElement): Node | null {
  return findPreviousNodeW2(el, {
    ceiling,
    shouldDescend: (node) => !isIsland(node) && !isToken(node) && !isIgnorable(node),
    pre: (node) => {
      if (isIgnorableNode(node)) return undefined;
      if (isTokenizableTextNode(node)) return node;
      if (isLineSibling(node)) return node;
      return undefined;
    }
  });
}

/**
 * Get next LINE_SIBLING in current LINE or in next LINE.
 *
 * Original iterator-based implementation, kept for reference. The active
 * implementation is {@link getNextLineSibling}, built on walk2.
 */
export function getNextLineSiblingV1(el: Node, ceiling: HTMLElement): Node | null {
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
 * Get next LINE_SIBLING in current LINE or in next LINE.
 *
 * Walks forward from `el` within `ceiling` in pre-order, descending into
 * CURSOR-transparent structure but not into ISLAND's, TOKEN's, or IGNORABLE's,
 * and returns the first reachable seat (a tokenizable text node or LINE_SIBLING),
 * skipping IGNORABLE nodes.
 */
export function getNextLineSibling(el: Node, ceiling: HTMLElement): Node | null {
  return findNextNodeW2(el, {
    ceiling,
    shouldDescend: (node) => !isIsland(node) && !isToken(node) && !isIgnorable(node),
    pre: (node) => {
      if (isIgnorableNode(node)) return undefined;
      if (isTokenizableTextNode(node)) return node;
      if (isLineSibling(node)) return node;
      return undefined;
    }
  });
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
