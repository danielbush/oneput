/**
 * Locate a FOCUSABLE relative to a node — the read-only query layer beneath the
 * stateful FOCUS owner in `src/focus/Nav.ts`.
 *
 * Every function here is a walk over the DOM parameterised by VISIT and DESCEND
 * (see `docs/vocabulary.md`). They differ only in where they start, which
 * direction they run, and how far they are allowed to descend or climb:
 *
 * - `findNext`/`findPreviousFocusable` — plain document order.
 * - `...Outside` — the same, but treating the start element as opaque, for when
 *   an op is about to consume or leave that element.
 * - `...SiblingFocusable` — same-parent only, tunnelling through
 *   FOCUS_TRANSPARENT siblings to the FOCUSABLE inside them.
 * - `...SiblingOrAncestorFocusable` — sibling first, then climb.
 * - `findClosestFocusableAncestor` / `findNextFocusableOnAncestorPath` — climb.
 *
 * Nothing here mutates the DOM.
 */
import { isFocusCandidate, isFocusable, isOpaque } from '../../core/taxonomy.js';
import { findNextNode, findPreviousNode, getParent } from '../../core/walk.js';

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
 * Find the next FOCUSABLE after `el`, skipping everything inside `el`.
 *
 * Note the DESCEND rule is deliberately looser than {@link focusWalk}: it omits
 * the isFocusCandidate test, so this walk descends into FOCUS_TRANSPARENT
 * subtrees that plain focus navigation would step over.
 */
export function findNextFocusableOutside(el: Node, ceiling: HTMLElement): HTMLElement | null {
  for (const next of findNextNode(el, ceiling, {
    visit: isFocusable,
    descend: (node) => !isOpaque(node) && node !== el
  })) {
    return next as HTMLElement;
  }
  return null;
}

/**
 * Find the previous FOCUSABLE before `el`, skipping everything inside `el`.
 *
 * A backwards walk reaches `el`'s descendants only by descending into `el`
 * itself, which findPreviousNode does not do from a start inside it — so unlike
 * {@link findNextFocusableOutside} no explicit `node !== el` guard is needed.
 */
export function findPreviousFocusableOutside(el: Node, ceiling: HTMLElement): HTMLElement | null {
  for (const previous of findPreviousNode(el, ceiling, {
    visit: isFocusable,
    descend: (node) => !isOpaque(node)
  })) {
    return previous as HTMLElement;
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
