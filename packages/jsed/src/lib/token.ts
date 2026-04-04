import {
  JSED_IMPLICIT_CLASS,
  JSED_ANCHOR_CHAR,
  JSED_ANCHOR_CLASS,
  JSED_TOKEN_CLASS,
  JSED_TOKEN_COLLAPSED,
  JSED_TOKEN_PADDED
} from './constants.js';
import { canCreateWithAnchor } from './dom-rules.js';
import { findNextNode } from './walk.js';
import {
  isFocusable,
  isIgnorable,
  isIsland,
  isToken,
  isAnchor,
  isInlineFlow,
  isImplicitLine,
  isLine,
  isTransparentBlock
} from './taxonomy.js';
import {
  getLine,
  getFirstLineSibling,
  getNextLineSibling,
  getPreviousTokenSibling,
  getNextTokenSibling
} from './sibwalk.js';

// #region TOKEN CRUD

export function getParent(el: HTMLElement): HTMLElement {
  if (!isToken(el)) {
    throw new Error('getParent: called on non-token');
  }
  const par = el.parentElement;
  if (!par) {
    throw new Error(
      'getParent: token has no parentElement is it attached to the dom or is it an HTML element?'
    );
  }
  return par;
}

/**
 * Create a TOKEN .
 *
 * @param text Should be non-whitespace
 */
export function createToken(text: string): HTMLElement {
  const el = document.createElement('span');
  el.classList.add(JSED_TOKEN_CLASS);
  el.appendChild(document.createTextNode(text));
  return el;
}

/**
 * Create an ANCHOR
 *
 * This is a token that contains text that represents a text anchor.  We add an
 * additional class to help detect it.
 */
export function createAnchor(): HTMLElement {
  // const el = createToken(JSED_ANCHOR_CHAR);
  const el = createToken('');
  el.classList.add(JSED_ANCHOR_CLASS);
  return el;
}

/**
 * It's easier to replaceText on an ANCHOR (we don't have to call focus and trigger a select-all in jsed-ui).
 */
function anchor2Token(token: HTMLElement): HTMLElement {
  token.classList.remove(JSED_ANCHOR_CLASS);
  return token;
}

export function getValue(token: HTMLElement): string {
  validate(token);
  if (isAnchor(token)) {
    return JSED_ANCHOR_CHAR;
  }
  return token.firstChild!.nodeValue as string;
}

// #endregion

// #region Tokenization

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
 * Quick-descend: tokenize and find the first TOKEN within a FOCUSABLE.
 * See SHALLOW_TOKENIZATION.
 *
 * Tokenizes the LINE containing the element and walks its LINE_SIBLING's.
 * If a LINE_SIBLING is an OPAQUE_BLOCK (not a TOKEN or ISLAND), recurses
 * into it. Skips ISLAND's. Returns null if no TOKEN is found — the
 * FOCUSABLE has no editable text content.
 */
export function quickDescend(el: HTMLElement): HTMLElement | null {
  if (isToken(el)) {
    return el;
  }
  if (!isFocusable(el)) {
    throw new Error('quickDescend: expects a FOCUSABLE');
  }

  // Example: `el` is an em-tag;  `line` is parent p-tag.
  const line = getLine(el);
  tokenizeLine(line);
  let sib = getFirstLineSibling(el);
  while (sib) {
    if (isToken(sib)) {
      return sib;
    }
    if (!isIsland(sib)) {
      const nested = quickDescend(sib);
      if (nested) return nested;
    }
    sib = getNextLineSibling(sib);
  }

  return null;
}

// #endregion

// #region Insert / Remove

export function insertAfter(toInsert: HTMLElement, existing: HTMLElement): void {
  if (!existing.parentNode) {
    throw new Error('parentNode not found');
  }
  existing.insertAdjacentElement('afterend', toInsert);

  // Need to add an anchor?
  // const nexttok = getNextTokenSibling(toInsert);
  // if (!nexttok) {
  //   const anchor = createAnchor();
  //   toInsert.insertAdjacentElement('afterend', anchor);
  // }
}

export function insertBefore(toInsert: HTMLElement, existing: HTMLElement): void {
  if (!existing.parentNode) {
    throw new Error('parentNode not found');
  }
  existing.insertAdjacentElement('beforebegin', toInsert);

  // Need to add an anchor?
  // const prevtok = getPreviousTokenSibling(toInsert);
  // if (!prevtok) {
  //   const anchor = createAnchor();
  //   toInsert.insertAdjacentElement('beforebegin', anchor);
  // }
}

/**
 * Assumes `isToken` is true, but checks for weird invalid states that might occur
 */
function validate(token: HTMLElement): void {
  if (isAnchor(token)) {
    return;
  }
  if (!token.firstChild) {
    throw new Error('token has no text');
  }
  if (token.firstChild.nodeType !== Node.TEXT_NODE) {
    throw new Error('first child should be a text node');
  }
}

function isWhitespaceTextNode(node: Node | null | undefined): node is Text {
  return node instanceof window.Text && /^\s+$/.test(node.nodeValue ?? '');
}

function getSeparatorBefore(token: HTMLElement): Text | null {
  const prev = token.previousSibling;
  return isWhitespaceTextNode(prev) ? prev : null;
}

function getSeparatorAfter(token: HTMLElement): Text | null {
  const next = token.nextSibling;
  return isWhitespaceTextNode(next) ? next : null;
}

/**
 * Ensure there is a whitespace separator immediately before the TOKEN.
 *
 * Used in PADDED_TOKEN's.
 */
function ensureSeparatorBefore(token: HTMLElement, value = ' '): Text {
  const existing = getSeparatorBefore(token);
  if (existing) {
    return existing;
  }
  const separator = document.createTextNode(value);
  token.parentNode?.insertBefore(separator, token);
  return separator;
}

/**
 * Ensure there is a whitespace separator immediately after the TOKEN.
 *
 * Used for default inter-TOKEN spacing when the TOKEN is not a
 * COLLAPSED_TOKEN.
 */
function ensureSeparatorAfter(token: HTMLElement, value = ' '): Text {
  const existing = getSeparatorAfter(token);
  if (existing) {
    return existing;
  }
  const separator = document.createTextNode(value);
  token.parentNode?.insertBefore(separator, token.nextSibling);
  return separator;
}

/**
 * Remove the whitespace separator immediately before the TOKEN, if present.
 */
function removeSeparatorBefore(token: HTMLElement): void {
  const separator = getSeparatorBefore(token);
  separator?.parentNode?.removeChild(separator);
}

/**
 * Remove the whitespace separator immediately after the TOKEN, if present.
 */
function removeSeparatorAfter(token: HTMLElement): void {
  const separator = getSeparatorAfter(token);
  separator?.parentNode?.removeChild(separator);
}

/**
 * Replaces the text of the existing token.
 *
 * If the token is an ANCHOR, we convert it in-place to a regular token and
 * replace the ANCHOR character with the text.  This makes it easy to
 * manage the CURSOR and cursor operations - we only call focus when we
 * create a new token eg after deleting the current CURSOR and only in
 * these situations will focus get called triggering a "select-all" in jsed-ui.
 *
 * In the boundary-spacing model this only updates visible TOKEN text. Spacing
 * before / after the TOKEN is managed by adjacent separator text nodes.
 */
export function replaceText(token: HTMLElement, val: string): HTMLElement {
  validate(token);
  anchor2Token(token);
  token.firstChild!.nodeValue = val.trim();
  return token;
}

/**
 * Remove the token and return the nearest token in the same LINE_SEGMENT. If no
 * tokens left we provide just an empty token with an anchor symbol to display
 * it.
 *
 * @param params.keepAnchor If the token has no immediate siblings around it under the same parent element, then insert a ANCHOR .
 */
export function remove(token: HTMLElement): { next: HTMLElement } {
  const parentNode = token.parentNode;
  if (!parentNode) {
    throw new Error('remove: token has no parentNode');
  }

  // An anchor exists once we've exhausted the LINE_SEGMENT of non-empty
  // TOKEN's. Operations that inject text back in should de-anchor the token.

  if (isAnchor(token)) {
    return { next: token };
  }

  const prevTok = getPreviousTokenSibling(token);
  const nextTok = getNextTokenSibling(token);
  const separatorBefore = getSeparatorBefore(token);
  const separatorAfter = getSeparatorAfter(token);

  // Keep at most one separator across the gap left by the removed TOKEN.
  // Edge separators (leading / trailing whitespace with no TOKEN on one side)
  // are dropped.
  if (prevTok && nextTok) {
    if (separatorBefore && separatorAfter) {
      separatorAfter.parentNode?.removeChild(separatorAfter);
    }
  } else {
    separatorBefore?.parentNode?.removeChild(separatorBefore);
    separatorAfter?.parentNode?.removeChild(separatorAfter);
  }

  parentNode.removeChild(token);

  const nextFocus = nextTok || prevTok;

  if (nextFocus) {
    return { next: nextFocus };
  }

  // We're out of text, we need to add a ANCHOR to this LINE_SEGMENT .

  const anchor = createAnchor();

  const prevEl = token.previousElementSibling;
  if (prevEl) {
    insertAfter(anchor, prevEl as HTMLElement);
    return { next: anchor };
  }

  const nextEl = token.nextElementSibling;
  if (nextEl) {
    insertBefore(anchor, nextEl as HTMLElement);
    return { next: anchor };
  }
  parentNode.appendChild(anchor);

  return { next: anchor };
}

/**
 * Add ANCHOR's where applicable to the FOCUSABLE.
 *
 * Existing ANCHOR's are unchanged.  Only direct descendant ANCHOR's of
 * the FOCUSABLE are inserted (no recursion).
 *
 * If the user has deleted an anchor with the intention of never adding text to the related LINE_SEGMENT, this function will put it back.
 */
export function addAnchors(el: HTMLElement): HTMLElement[] {
  if (el.classList.contains(JSED_TOKEN_CLASS)) {
    throw new Error('addAnchors: expects an FOCUSABLE');
  }
  let segment = { hasTokens: false };
  const anchors: HTMLElement[] = [];
  const children = Array.from(el.children); // avoid infinite loops
  for (const child of children) {
    if (isIgnorable(child)) {
      // eg element indicator in jsed-ui
      continue;
    }
    if (isToken(child)) {
      segment.hasTokens = true;
      continue;
    }
    // We've hit a non-token...
    if (!segment.hasTokens) {
      const anchor = createAnchor();
      anchors.push(anchor);
      child.insertAdjacentElement('beforebegin', anchor);
    }
    // Start new segment...
    segment = { hasTokens: false };
  }
  if (!segment.hasTokens) {
    const anchor = createAnchor();
    anchors.push(anchor);
    el.appendChild(anchor);
  }
  return anchors;
}

// #endregion

// #region Spacing

/**
 * Token is a COLLAPSED_TOKEN.
 *
 * In the boundary-spacing model this means there is no separator text node
 * immediately after the TOKEN.
 */
export function isCollapsed(token: HTMLElement): boolean {
  return token.classList.contains(JSED_TOKEN_COLLAPSED);
}

/**
 * Perform TOGGLE_COLLAPSE "on" on TOKEN.
 *
 * In the boundary-spacing model this removes the separator after the TOKEN.
 */
export function collapse(token: HTMLElement): HTMLElement {
  validate(token);
  token.classList.add(JSED_TOKEN_COLLAPSED);
  removeSeparatorAfter(token);
  return token;
}

/**
 * Perform TOGGLE_COLLAPSE "off" on TOKEN.
 *
 * In the boundary-spacing model this ensures there is a separator after the
 * TOKEN.
 */
export function uncollapse(token: HTMLElement): HTMLElement {
  validate(token);
  token.classList.remove(JSED_TOKEN_COLLAPSED);
  ensureSeparatorAfter(token);
  return token;
}

/**
 * Check if TOKEN is a PADDED_TOKEN.
 *
 * In the boundary-spacing model this means there is explicit separator
 * whitespace immediately before the TOKEN.
 */
export function isPadded(token: HTMLElement): boolean {
  return token.classList.contains(JSED_TOKEN_PADDED);
}

/**
 * Convert to PADDED_TOKEN.
 *
 * In the boundary-spacing model this ensures there is separator whitespace
 * immediately before the TOKEN. PADDED_TOKEN remains as a transitional class
 * while spacing migrates away from TOKEN-owned text content.
 */
export function pad(token: HTMLElement): HTMLElement {
  validate(token);
  token.classList.add(JSED_TOKEN_PADDED);
  ensureSeparatorBefore(token);
  return token;
}

/**
 * Convert PADDED_TOKEN to TOKEN.
 *
 * In the boundary-spacing model this removes separator whitespace immediately
 * before the TOKEN.
 */
export function unpad(token: HTMLElement): HTMLElement {
  validate(token);
  token.classList.remove(JSED_TOKEN_PADDED);
  removeSeparatorBefore(token);
  return token;
}

// #endregion

// #region Operations

export function joinNext(token: HTMLElement): void {
  const next = getNextTokenSibling(token);
  if (!next) {
    return;
  }
  const nextSeparatorValue = getSeparatorAfter(next)?.nodeValue ?? null;
  const val = getValue(token);
  const nextVal = getValue(next);
  replaceText(token, val + nextVal);
  removeSeparatorAfter(token);
  remove(next);
  if (nextSeparatorValue) {
    ensureSeparatorAfter(token, nextSeparatorValue);
    token.classList.remove(JSED_TOKEN_COLLAPSED);
  } else {
    token.classList.add(JSED_TOKEN_COLLAPSED);
  }
}

export function joinPrevious(token: HTMLElement): void {
  const prev = getPreviousTokenSibling(token);
  if (!prev) {
    return;
  }
  const prevSeparatorValue = getSeparatorBefore(prev)?.nodeValue ?? null;
  const val = getValue(token);
  const prevVal = getValue(prev);
  replaceText(token, prevVal + val);
  removeSeparatorBefore(token);
  remove(prev);
  if (prevSeparatorValue) {
    ensureSeparatorBefore(token, prevSeparatorValue);
    token.classList.add(JSED_TOKEN_PADDED);
  } else {
    token.classList.remove(JSED_TOKEN_PADDED);
  }
}

/**
 * Move anything before `token` to a new parent before the current parent (SPLIT_BY_TOKEN).
 */
export function splitBefore(token: HTMLElement): HTMLElement[] {
  const prevTok = getPreviousTokenSibling(token);
  const par = getParent(token);
  const line = getLine(token);
  const prevPar = document.createElement(par.tagName);
  par.insertAdjacentElement('beforebegin', prevPar);
  // We may need to put an anchor between prevPar and par.
  if (line !== par) {
    const anchor = createAnchor();
    par.insertAdjacentElement('beforebegin', anchor);
  }
  if (!prevTok) {
    if (canCreateWithAnchor(prevPar.tagName)) {
      addAnchors(prevPar);
    }
  }
  // Move tokens and non-tokens across.
  for (let sib: ChildNode | null = token.previousSibling; sib; ) {
    const prevSib: ChildNode | null = sib.previousSibling;
    prevPar.insertBefore(sib, prevPar.firstChild);
    sib = prevSib;
  }
  return [prevPar, par];
}

/**
 * Move anything after `token` to a new parent after the current parent (SPLIT_BY_TOKEN).
 */
export function splitAfter(token: HTMLElement): HTMLElement[] {
  const nextTok = getNextTokenSibling(token);
  const par = getParent(token);
  const line = getLine(token);
  const nextPar = document.createElement(par.tagName);
  par.insertAdjacentElement('afterend', nextPar);
  // We may need to put an anchor between prevPar and par.
  if (line !== par) {
    const anchor = createAnchor();
    par.insertAdjacentElement('afterend', anchor);
  }
  if (!nextTok) {
    if (canCreateWithAnchor(nextPar.tagName)) {
      addAnchors(nextPar);
    }
  }
  // Move tokens and non-tokens across.
  for (let sib: ChildNode | null = token.nextSibling; sib; ) {
    const nextSib: ChildNode | null = sib.nextSibling;
    nextPar.appendChild(sib);
    sib = nextSib;
  }
  return [par, nextPar];
}

// #endregion

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
