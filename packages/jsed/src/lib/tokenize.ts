import { isFocusable, isCursorTransparent, isToken, isLineSibling } from './taxonomy.js';
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
 * Recursively tokenize a LINE.
 *
 * Recurses into CURSOR_TRANSPARENT structure — everything the CURSOR would
 * descend through. Skips OPAQUE_BLOCK's and ISLAND's but continues past them
 * to tokenize the rest of the LINE. Returns the first TOKEN created at any
 * depth, or null if nothing was tokenized.
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
    if (isCursorTransparent(child)) {
      const nestedFirst = tokenizeLineRec(child);
      if (!first) first = nestedFirst;
    } else if (child.nodeType === Node.TEXT_NODE) {
      const token = replaceTextNode(child);
      if (token && !first) first = token;
    } else {
      if (!first && isLineSibling(child)) {
        first = child as HTMLElement;
      }
    }
    // OPAQUE_BLOCK's, ISLAND's, and other elements: skip but continue loop
  }

  return first;
}

function replaceTokenElement(token: HTMLElement): void {
  if (!isToken(token)) {
    throw new Error('replaceTokenElement: called on non-token');
  }

  const text = token.textContent ?? '';
  const textNode = document.createTextNode(text);
  token.parentNode?.insertBefore(textNode, token);
  token.parentNode?.removeChild(token);
}

/**
 * Recursively detokenize a LINE.
 *
 * Mirrors tokenizeLineRec by descending only through CURSOR_TRANSPARENT
 * structure.
 * TOKEN wrappers are replaced with plain text nodes; ISLAND's and
 * OPAQUE_BLOCK's are left untouched.
 */
function detokenizeLineRec(line: Node): void {
  const childNodes = Array.from(line.childNodes);

  for (const child of childNodes) {
    if (isToken(child)) {
      replaceTokenElement(child as HTMLElement);
      continue;
    }

    if (isCursorTransparent(child)) {
      detokenizeLineRec(child);
    }
  }
}

/**
 * Tokenize a LINE — recurses into TRANSPARENT_BLOCK's but not OPAQUE_BLOCK's
 * or ISLAND's. Returns the first TOKEN created, or null if there was nothing
 * to tokenize (already tokenized, or no text content).
 *
 * Part of SHALLOW_TOKENIZATION strategy.
 */
export function tokenizeLine(el: HTMLElement): HTMLElement | null {
  if (!isFocusable(el)) {
    return null;
  }
  el.normalize();
  return tokenizeLineRec(el);
}

/**
 * Reverse tokenizeLine for a LINE.
 *
 * Removes TOKEN wrappers from the LINE and from any CURSOR-transparent
 * descendants that were tokenized as part of the same shallow tokenization
 * pass, then normalizes text nodes back together.
 */
export function detokenizeLine(el: HTMLElement): void {
  if (!isFocusable(el)) {
    throw new Error('Can only detokenize a FOCUSABLE');
  }

  detokenizeLineRec(el);
  el.normalize();
}
