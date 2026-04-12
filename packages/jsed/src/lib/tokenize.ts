import { getFirstLineSibling, getLine, getNextLineSibling } from './sibwalk.js';
import {
  isFocusable,
  isLineSibling,
  isImplicitLine,
  isInlineFlow,
  isIsland,
  isToken,
  isTransparentBlock
} from './taxonomy.js';
import { createToken } from './token.js';

/**
 * Used by tokenizer to convert text nodes to TOKEN's.
 * Returns the first TOKEN created, or null if the child was not a text node.
 */
function replaceTextNode(child: Node): HTMLElement | null {
  const el = child.parentNode;
  if (isToken(el)) {
    throw new Error(
      'replaceTextNode: called on existing token - this should not happen we should track what has been tokenized.'
    );
  }
  if (child.nodeType === Node.TEXT_NODE) {
    const text = child.nodeValue!;
    const parts = text.match(/\s+|\S+/g) ?? [];
    const frag = document.createDocumentFragment();
    let first: HTMLElement | null = null;

    for (const part of parts) {
      if (/^\s+$/.test(part)) {
        // Boundary-spacing model: preserve inter-token whitespace as its own
        // text node rather than baking it into TOKEN content.
        frag.appendChild(document.createTextNode(part));
        continue;
      }

      const token = createToken(part);
      if (!first) first = token;
      frag.appendChild(token);
    }

    el?.insertBefore(frag, child);
    el?.removeChild(child);
    return first;
  }
  return null;
}

/**
 * Recursively tokenize a LINE. Returns the first TOKEN created.
 *
 * Recurses into INLINE_FLOW's and TRANSPARENT_BLOCK's (including IMPLICIT_LINE's)
 * — everything the CURSOR would descend through. Skips OPAQUE_BLOCK's and
 * ISLAND's but continues past them to tokenize the rest of the LINE.
 */
function tokenizeLineRec(line: Node): HTMLElement | null {
  if (isToken(line)) {
    return null;
  }

  // Record childNodes before we mutate and convert to array as the NodeList is
  // live!
  const childNodes = Array.from(line.childNodes);
  let first: HTMLElement | null = null;
  for (const child of childNodes) {
    // Recurse into INLINE_FLOW's (isInlineFlow && !isIsland), IMPLICIT_LINE's,
    // and TRANSPARENT_BLOCK's.
    if (
      isImplicitLine(child) ||
      (isFocusable(child) && !isIsland(child) && isInlineFlow(child)) ||
      isTransparentBlock(child)
    ) {
      const token = tokenizeLineRec(child);
      if (!first) first = token;
    } else if (child.nodeType === Node.TEXT_NODE) {
      const token = replaceTextNode(child);
      if (!first) first = token;
    }
    // OPAQUE_BLOCK's, ISLAND's, and other elements: skip but continue loop
  }
  return first;
}

/**
 * Tokenize a LINE — recurses into TRANSPARENT_BLOCK's but not OPAQUE_BLOCK's
 * or ISLAND's. Returns the first TOKEN created, or null if nothing to tokenize.
 *
 * Part of SHALLOW_TOKENIZATION strategy.
 */
export function tokenizeLine(el: HTMLElement): HTMLElement | null {
  if (!isFocusable(el)) {
    throw new Error('Can only tokenize an FOCUSABLE');
  }
  el.normalize();
  return tokenizeLineRec(el);
}

/**
 * Quick-descend: tokenize and find the first LINE_SIBLING within a FOCUSABLE.
 * See SHALLOW_TOKENIZATION.
 *
 * Tokenizes the LINE containing the element and walks its LINE_SIBLING's.
 * Returns null if no LINE_SIBLING is found.
 */
export function quickDescend(el: HTMLElement): HTMLElement | null {
  if (isToken(el) || isIsland(el)) {
    return el;
  }
  if (!isFocusable(el)) {
    throw new Error('quickDescend: expects a FOCUSABLE');
  }

  // Example: `el` is an em-tag; `line` is parent p-tag.
  const line = getLine(el);
  tokenizeLine(line);

  let sib: HTMLElement | null;
  if (el === line) {
    sib = getFirstLineSibling(line);
  } else {
    sib = isLineSibling(el) ? el : getFirstLineSibling(el);
  }

  while (sib) {
    if (isToken(sib) || isIsland(sib)) {
      return sib;
    }

    const nested = quickDescend(sib);
    if (nested) {
      return nested;
    }

    sib = getNextLineSibling(sib);
  }

  return null;
}
