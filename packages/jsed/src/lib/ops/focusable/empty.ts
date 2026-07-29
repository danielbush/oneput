/**
 * Emptiness tests that see past the bookkeeping layer.
 *
 * An element holding only an ANCHOR placeholder or IGNORE nodes is empty as far
 * as the user is concerned, so these predicates look through both.
 */
import { getNextSibling } from '../../core/sibling.js';
import { isAnchor, isIgnorableNode } from '../../core/taxonomy.js';

export function isEmpty(el: Node): boolean {
  const sib = getNextSibling(
    el.firstChild,
    (node) => !isAnchor(node) && !isIgnorableNode(node),
    true
  );
  return !sib;
}

/**
 * Like isEmpty, but for needle.
 */
export function containsOnly(container: Node, needle: Node): boolean {
  return Array.from(container.childNodes).every((child) => {
    if (child === needle) return true;
    return isAnchor(child) || isIgnorableNode(child);
  });
}
