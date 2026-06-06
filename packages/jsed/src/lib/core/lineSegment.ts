import { getNextSibling, getPreviousSibling } from './sibling';
import { isIgnorable, isToken, isTokenizableTextNode, isWhitespaceTextNode } from './taxonomy';

/**
 * Return true if LINE_SEGMENT has no other text-bearing LINE_SIBLING's besides node.
 *
 * `node` should probably be a TOKEN.
 */
export function isLastText(node: Node) {
  const nextSib = getNextSibling(
    node,
    (sib) => !isIgnorable(sib) && !isWhitespaceTextNode(sib),
    false
  );
  if (isToken(nextSib) || isTokenizableTextNode(nextSib)) {
    return false;
  }
  const prevSib = getPreviousSibling(
    node,
    (sib) => !isIgnorable(sib) && !isWhitespaceTextNode(sib),
    false
  );
  if (isToken(prevSib) || isTokenizableTextNode(prevSib)) {
    return false;
  }
  return true;
}
