import { getNextSibling, getPreviousSibling } from './sibling';
import { isLineSibling, isTokenizableTextNode } from './taxonomy';

/**
 * Return true if LINE_SEGMENT has no other LINE_SIBLING's besides node.
 */
export function isLastLineSibling(node: Node) {
  const nextSib = getNextSibling(
    node,
    (sib) => isTokenizableTextNode(sib) || isLineSibling(sib),
    false
  );
  if (nextSib) {
    return false;
  }
  const prevSib = getPreviousSibling(
    node,
    (sib) => isTokenizableTextNode(sib) || isLineSibling(sib),
    false
  );
  if (prevSib) {
    return false;
  }
  return true;
}
