import { JSED_IMPLICIT_CLASS } from './constants.js';
import {
  isFocusable,
  isImplicitLine,
  isInlineFlow,
  isIsland,
  isLine,
  isToken
} from './taxonomy.js';
import { findNextNode } from './walk.js';

/**
 * Create an IMPLICIT_LINE starting with `startNode` and slurping up anything
 * directly next of it that is a text node or an INLINE.
 *
 * `startNode` may be a text node or an INLINE element — either can begin an
 * IMPLICIT_LINE.
 */
function buildImplicitLine(startNode: Node): HTMLElement | null {
  if (!startNode.parentNode) {
    throw new Error(`Expected node to have parent.`);
  }
  startNode.parentNode.normalize();

  // Skip whitespace-only text nodes — they're artifacts of HTML source formatting.
  if (startNode.nodeType === Node.TEXT_NODE) {
    if (!startNode.nodeValue || /^\s+$/.test(startNode.nodeValue)) {
      return null;
    }
  }

  const implicitLine = document.createElement('span');
  implicitLine.className = JSED_IMPLICIT_CLASS;
  startNode.parentNode.insertBefore(implicitLine, startNode);

  for (let sib: Node | null = startNode; sib; ) {
    // Slurp text nodes, tokens, and INLINE elements (isInlineFlow, not island, not implicit-line)
    if (
      sib.nodeType === Node.TEXT_NODE ||
      isToken(sib) ||
      (isFocusable(sib) && !isIsland(sib) && !isImplicitLine(sib) && isInlineFlow(sib))
    ) {
      const nextSib: ChildNode | null = sib.nextSibling;
      implicitLine.appendChild(sib);
      sib = nextSib;
    } else {
      break;
    }
  }
  return implicitLine;
}

/**
 * Find and handle IMPLICIT_LINE's.
 *
 * Wraps bare text/INLINE nodes that follow a LINE sibling — these are not
 * reachable by FOCUS on their own, so we wrap them in a `<span>` with
 * JSED_IMPLICIT_CLASS to make them a FOCUSABLE LINE.
 *
 * Only triggers when the previous sibling is a LINE (not an ISLAND or other
 * non-block FOCUSABLE). Text next to an ISLAND within a LINE is part of that
 * LINE and doesn't need wrapping.
 *
 * Run this on the whole doc at the beginning BEFORE any tokenization occurs.
 */
export function tagImplicitLines(root: HTMLElement) {
  for (const node of findNextNode(root, root, {
    visit: (node) => node?.nodeType === Node.ELEMENT_NODE
  })) {
    if (isImplicitLine(node)) {
      continue;
    }
    for (let sib = node.firstChild; sib; ) {
      // Text, tokens, and INLINE elements (isInlineFlow, not island, not implicit-line)
      if (
        sib.nodeType === Node.TEXT_NODE ||
        isToken(sib) ||
        (isFocusable(sib) && !isIsland(sib) && !isImplicitLine(sib) && isInlineFlow(sib))
      ) {
        const prev = sib.previousSibling;
        if (prev && (isLine(prev) || isIsland(prev))) {
          // Wrap after any non-INLINE_FLOW element. INLINE_FLOW elements
          // (display: inline / inline flow) sit in the same text run as
          // surrounding content. Everything else (block, inline-block,
          // inline-flex, etc.) breaks the text run and trailing text needs
          // an IMPLICIT_LINE to be reachable by FOCUS.
          if (!isInlineFlow(prev)) {
            const implicitLine = buildImplicitLine(sib);
            if (implicitLine) {
              sib = implicitLine.nextSibling;
              continue;
            }
          }
        }
      }
      sib = sib.nextSibling;
    }
  }
}
