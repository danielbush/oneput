import { isFocusCandidate, isFocusable, isOpaque } from '../core/taxonomy.js';
import { findNextNode, findPreviousNode, getParent } from '../core/walk.js';

const focusWalk = {
  visit: isFocusable,
  descend: (node: Node) => isFocusCandidate(node) && !isOpaque(node)
};

/**
 * Find the next FOCUSABLE in document order within a ceiling.
 */
export function findNextFocusable(start: Node, ceiling: Node): HTMLElement | null {
  for (const node of findNextNode(start, ceiling, focusWalk)) {
    if (isFocusable(node)) {
      return node;
    }
  }
  return null;
}

/**
 * Find the previous FOCUSABLE in document order within a ceiling.
 */
export function findPreviousFocusable(start: Node, ceiling: Node): HTMLElement | null {
  for (const node of findPreviousNode(start, ceiling, focusWalk)) {
    if (isFocusable(node)) {
      return node;
    }
  }
  return null;
}

/**
 * Find the closest FOCUSABLE ancestor, including `start`, within a ceiling.
 */
export function findClosestFocusableAncestor(
  start: Node | null,
  ceiling: Node | null = null
): HTMLElement | null {
  if (start && ceiling && !ceiling.contains(start)) {
    return null;
  }

  for (let node = start; node; node = getParent(node, ceiling)) {
    if (isFocusable(node)) {
      return node;
    }
  }
  return null;
}

/**
 * Find the next FOCUSABLE below an ancestor on a remembered descendant path.
 */
export function findNextFocusableOnAncestorPath(
  ancestor: HTMLElement,
  descendant: HTMLElement
): HTMLElement | null {
  if (ancestor === descendant || !ancestor.contains(descendant)) {
    return null;
  }

  let focusableBelow = isFocusable(descendant) ? descendant : null;
  for (let parent = descendant.parentElement; parent; parent = parent.parentElement) {
    if (parent === ancestor) {
      return focusableBelow;
    }
    if (isFocusable(parent)) {
      focusableBelow = parent;
    }
  }
  return null;
}

/**
 * Find the first FOCUSABLE descendant inside a subtree.
 */
function findFirstFocusableDescendant(element: Node): HTMLElement | null {
  for (const node of findNextNode(element, element, focusWalk)) {
    if (isFocusable(node)) {
      return node;
    }
  }
  return null;
}

/**
 * Find the last FOCUSABLE descendant inside a subtree.
 */
function findLastFocusableDescendant(element: Node): HTMLElement | null {
  let last: HTMLElement | null = null;
  for (const node of findNextNode(element, element, focusWalk)) {
    if (isFocusable(node)) {
      last = node;
    }
  }
  return last;
}

/**
 * Find the next same-parent FOCUSABLE, tunnelling through transparent siblings.
 */
export function findNextSiblingFocusable(start: Node): HTMLElement | null {
  for (let sibling = start.nextSibling; sibling; sibling = sibling.nextSibling) {
    if (isFocusable(sibling)) {
      return sibling;
    }
    if (isFocusCandidate(sibling) && !isOpaque(sibling)) {
      const descendant = findFirstFocusableDescendant(sibling);
      if (descendant) {
        return descendant;
      }
    }
  }
  return null;
}

/**
 * Find the previous same-parent FOCUSABLE, tunnelling through transparent siblings.
 */
export function findPreviousSiblingFocusable(start: Node): HTMLElement | null {
  for (let sibling = start.previousSibling; sibling; sibling = sibling.previousSibling) {
    if (isFocusable(sibling)) {
      return sibling;
    }
    if (isFocusCandidate(sibling) && !isOpaque(sibling)) {
      const descendant = findLastFocusableDescendant(sibling);
      if (descendant) {
        return descendant;
      }
    }
  }
  return null;
}

/**
 * Find the next sibling FOCUSABLE, climbing ancestors until the ceiling.
 */
export function findNextSiblingOrAncestorFocusable(start: Node, ceiling: Node): HTMLElement | null {
  const sibling = findNextSiblingFocusable(start);
  if (sibling) {
    return sibling;
  }

  for (
    let ancestor = start.parentNode;
    ancestor && ancestor !== ceiling;
    ancestor = ancestor.parentNode
  ) {
    const next = findNextSiblingFocusable(ancestor);
    if (next) {
      return next;
    }
  }
  return null;
}

/**
 * Find the previous sibling or containing FOCUSABLE, climbing to the ceiling.
 */
export function findPreviousSiblingOrAncestorFocusable(
  start: Node,
  ceiling: Node
): HTMLElement | null {
  const sibling = findPreviousSiblingFocusable(start);
  if (sibling) {
    return sibling;
  }

  for (
    let ancestor = start.parentNode;
    ancestor && ancestor !== ceiling;
    ancestor = ancestor.parentNode
  ) {
    if (isFocusable(ancestor)) {
      return ancestor;
    }
    const previous = findPreviousSiblingFocusable(ancestor);
    if (previous) {
      return previous;
    }
  }
  return null;
}
