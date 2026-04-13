import { getFirstLineSibling, getLine } from './sibwalk.js';
import { isFocusable, isCursorTransparent, isLineSibling, isIsland, isToken } from './taxonomy.js';
import { createToken } from './token.js';
import { findNextNode } from './walk.js';

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

type TokenizeLineRecResult = {
  first: HTMLElement | null;
  tokenizedSelf: boolean;
};

/**
 * Recursively tokenize a LINE.
 *
 * Recurses into CURSOR_TRANSPARENT structure — everything the CURSOR would
 * descend through. Skips OPAQUE_BLOCK's and ISLAND's but continues past them
 * to tokenize the rest of the LINE.
 */
function tokenizeLineRec(line: Node, tokenizedLines?: Set<HTMLElement>): TokenizeLineRecResult {
  if (isToken(line)) {
    return { first: null, tokenizedSelf: false };
  }

  // Record childNodes before we mutate and convert to array as the NodeList is
  // live!
  const childNodes = Array.from(line.childNodes);
  let first: HTMLElement | null = null;
  let tokenizedSelf = false;
  for (const child of childNodes) {
    if (isCursorTransparent(child)) {
      const nested = tokenizeLineRec(child, tokenizedLines);
      if (!first) first = nested.first;
    } else if (child.nodeType === Node.TEXT_NODE) {
      const token = replaceTextNode(child);
      if (token) {
        tokenizedSelf = true;
        if (!first) first = token;
      }
    }
    // OPAQUE_BLOCK's, ISLAND's, and other elements: skip but continue loop
  }

  if (tokenizedSelf && line instanceof HTMLElement) {
    tokenizedLines?.add(getLine(line));
  }

  return { first, tokenizedSelf };
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
 * or ISLAND's. Returns the first TOKEN created, or null if nothing to tokenize.
 *
 * Part of SHALLOW_TOKENIZATION strategy.
 */
export function tokenizeLine(el: HTMLElement): HTMLElement | null {
  if (!isFocusable(el)) {
    throw new Error('Can only tokenize an FOCUSABLE');
  }
  el.normalize();
  return tokenizeLineRec(el).first;
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

export type QuickDescendResult = {
  line: HTMLElement;
  target: HTMLElement | null;
  tokenizedLines: HTMLElement[];
};

function tokenizeTrackedLine(line: HTMLElement, tokenizedLines: Set<HTMLElement>): void {
  line.normalize();
  tokenizeLineRec(line, tokenizedLines);
}

function isCandidateNode(node: ParentNode | ChildNode): boolean {
  if (isToken(node) || isIsland(node)) {
    return true;
  }
  return node.nodeType === Node.TEXT_NODE && /\S/.test(node.textContent ?? '');
}

/**
 * Quick-descend: tokenize and find the first LINE_SIBLING within a FOCUSABLE.
 * See SHALLOW_TOKENIZATION.
 *
 * Algorithm:
 * - get the LINE for el (root line)
 *   - reason: el could be CURSOR_TRANSPARENT eg an INLINE_FLOW
 * - starting with el, search within root line for the first candidate node
 *   - a candidate node is non-whitespace text, TOKEN, or ISLAND
 *   - then call getLine(candidate) to get the candidate line
 * - call tokenizeLine on the candidate line
 * - return the candidate line's first reachable LINE_SIBLING
 * - only one line (the candidate line) is tokenized
 */
export function quickDescend(el: HTMLElement): QuickDescendResult {
  const rootLine = getLine(el);
  if (isToken(el) || isIsland(el)) {
    return { line: rootLine, target: el, tokenizedLines: [] };
  }
  if (!isFocusable(el)) {
    throw new Error('quickDescend: expects a FOCUSABLE');
  }

  const tokenizedLines = new Set<HTMLElement>();
  let candidateNode: ParentNode | ChildNode | null = null;
  if (isCandidateNode(el)) {
    candidateNode = el;
  } else {
    for (const node of findNextNode(el, rootLine, {
      visit: isCandidateNode,
      descend: isFocusable
    })) {
      candidateNode = node;
      break;
    }
  }
  if (!candidateNode) {
    return { line: rootLine, target: null, tokenizedLines: [] };
  }

  const line = getLine(candidateNode);
  tokenizeTrackedLine(line, tokenizedLines);

  let target: HTMLElement | null;
  if (line === rootLine) {
    if (el === rootLine) {
      target = getFirstLineSibling(rootLine);
    } else {
      target = isLineSibling(el) ? el : getFirstLineSibling(el);
    }
  } else {
    target = getFirstLineSibling(line);
  }

  return {
    line: rootLine,
    target,
    tokenizedLines: Array.from(tokenizedLines)
  };
}
