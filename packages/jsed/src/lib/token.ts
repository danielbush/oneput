import {
  JSED_IMPLICIT_CLASS,
  JSED_ANCHOR_CHAR,
  JSED_ANCHOR_CLASS,
  JSED_TOKEN_CLASS,
  JSED_TOKEN_COLLAPSED,
  JSED_TOKEN_PADDED
} from './constants.js';
import { canCreateWithAnchor } from './dom-rules.js';
import { findNextNode } from './walk2.js';
import {
  isFocusable,
  isIgnorable,
  isIsland,
  isToken,
  isAnchor,
  isInline,
  getLine,
  getPreviousVisibleSibling,
  getPreviousTokenSibling,
  getNextTokenSibling
} from './traversal.js';

// Re-export traversal predicates that were historically part of this module,
// so that `import * as token from './token.js'` consumers keep working.
export {
  isFocusable,
  isIgnorable,
  isIsland,
  isToken,
  isAnchor,
  isInline,
  isImplicitLine,
  isLineSibling,
  isLine,
  isCursorBoundary,
  isBlockTransparent,
  isSameLine,
  getLine,
  getPreviousVisibleSibling,
  getNextVisibleSibling,
  getPreviousTokenSibling,
  getNextTokenSibling,
  getPreviousLineSibling,
  getNextLineSibling,
  getFirstLineSibling
} from './traversal.js';
export type { LineSiblingOptions } from './traversal.js';

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
  // Create uncollapsed by default:
  const content = text.endsWith(' ') ? text : text + ' ';
  el.appendChild(document.createTextNode(content));
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
  return token.firstChild!.nodeValue?.trim() as string;
}

// #endregion

// #region Tokenization

/**
 * Used by tokenizer to convert text nodes to TOKEN's.
 * Returns the first TOKEN created, or null if the child was not a text node.
 */
function replaceTextNode(child: ParentNode | ChildNode): HTMLElement | null {
  const el = child.parentNode;
  if (isToken(el)) {
    throw new Error(
      'replaceTextNode: called on existing token - this should not happen we should track what has been tokenized.'
    );
  }
  if (child.nodeType === Node.TEXT_NODE) {
    const text = child.nodeValue!;
    const tokens = text
      .split(/\s+/)
      .filter(Boolean)
      .map((s) => createToken(s));
    // PADDED_TOKEN: if text has leading whitespace and previous visible sibling
    // is an ISLAND (which has no trailing space), pad the first TOKEN.
    if (
      tokens.length > 0 &&
      /^\s/.test(text) &&
      isIsland(getPreviousVisibleSibling(child as ChildNode))
    ) {
      pad(tokens[0]);
    }
    const frag = document.createDocumentFragment();
    for (const token of tokens) {
      frag.appendChild(token);
    }
    el?.insertBefore(frag, child);
    el?.removeChild(child);
    return tokens[0] ?? null;
  }
  return null;
}

/**
 * Recursively tokenize a LINE. Returns the first TOKEN created.
 */
function tokenizeLineRec(line: ParentNode | ChildNode): HTMLElement | null {
  // Record childNodes before we mutate and convert to array as the NodeList is
  // live!
  const childNodes = Array.from(line.childNodes);
  let first: HTMLElement | null = null;
  for (const child of childNodes) {
    if (isToken(line)) {
      continue;
    }
    // Recurse into inline tags eg em-tag.
    // Be aware of INLINE_COMPUTED_STYLE .
    if (isToken(child) || isInline(child)) {
      const token = tokenizeLineRec(child);
      if (!first) first = token;
    } else {
      const token = replaceTextNode(child);
      if (!first) first = token;
    }
  }
  return first;
}

/**
 * Tokenize a LINE (SHALLOW_TOKENIZATION — does not recurse into NESTED_LINE's).
 * Returns the first TOKEN created, or null if there was nothing to tokenize.
 */
export function tokenizeLine(el: HTMLElement): HTMLElement | null {
  if (!isFocusable(el)) {
    throw new Error('Can only tokenize an FOCUSABLE');
  }
  el.normalize();
  return tokenizeLineRec(el);
}

/**
 * Create an IMPLICIT_LINE starting with `textNode` and slurping up anything
 * directly next of it that is a text node or an inline node.
 */
function buildImplicitLine(textNode: Node): HTMLElement | null {
  if (!textNode.parentNode) {
    throw new Error(`Expected node to have parent.`);
  }
  textNode.parentNode.normalize(); // ok, so really there is just one text node now...
  if (!textNode.nodeValue || /^\s+$/.test(textNode.nodeValue)) {
    // Space nodes are generated between tags as an artifact of the html source.
    // Ignore these.
    return null;
  }

  const implicitLine = document.createElement('span');
  implicitLine.className = JSED_IMPLICIT_CLASS;
  textNode.parentNode.insertBefore(implicitLine, textNode);

  for (let sib: Node | null = textNode; sib; ) {
    if (sib.nodeType === Node.TEXT_NODE || isToken(sib) || isInline(sib)) {
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
 * Run this on the whole doc at the beginning BEFORE any tokenization occurs.
 */
export function tagImplicitLines(root: HTMLElement) {
  for (const node of findNextNode(root, root, {
    visit: (node) => node?.nodeType === Node.ELEMENT_NODE
  })) {
    // if (isImplicitLine(node)) {
    //   // findNextNode may walk over the IMPLICIT_LINE we just created causing an
    //   // infinite loop.
    //   continue;
    // }
    for (let sib = node.firstChild; sib; ) {
      if (sib.nodeType === Node.TEXT_NODE || isToken(sib) || isInline(sib)) {
        // const implicitLine = buildImplicitLine(sib);
        // if (implicitLine) {
        //   sib = implicitLine.nextSibling;
        //   continue;
        // }

        const prev = sib.previousSibling;
        if (prev) {
          if (isFocusable(prev) && !isToken(prev) && !isInline(prev)) {
            const implicitLine = buildImplicitLine(sib);
            if (implicitLine) {
              // An implicit line was created and sucked up continguous text tokens.
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
  if (!token.firstChild) {
    throw new Error('token has no text');
  }
  if (token.firstChild.nodeType !== Node.TEXT_NODE) {
    throw new Error('first child should be a text node');
  }
}

/**
 * Replaces the text of the existing token.
 *
 * If the token is an ANCHOR, we convert it in-place to a regular token and
 * replace the ANCHOR character with the text.  This makes it easy to
 * manage the CURSOR and cursor operations - we only call focus when we
 * create a new token eg after deleting the current CURSOR and only in
 * these situations will focus get called triggering a "select-all" in jsed-ui.
 */
export function replaceText(token: HTMLElement, val: string): HTMLElement {
  validate(token);
  anchor2Token(token);
  let content = val.trim();
  if (!isCollapsed(token)) {
    content = content + ' ';
  }
  if (isPadded(token)) {
    content = ' ' + content;
  }
  token.firstChild!.nodeValue = content;
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

  // PADDED_TOKEN transfer: if the deleted TOKEN is padded, the next TOKEN
  // inherits the padding (it's now adjacent to the ISLAND). If there's no
  // next TOKEN, the padding is simply dropped.
  if (isPadded(token)) {
    const next = getNextTokenSibling(token);
    if (next) {
      pad(next);
    }
  }

  // Grab this if it exists before we delete...
  const nextTok = getNextTokenSibling(token) || getPreviousTokenSibling(token);

  parentNode.removeChild(token);

  if (nextTok) {
    return { next: nextTok };
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
 * Token is a COLLAPSED_TOKEN .
 */
export function isCollapsed(token: HTMLElement): boolean {
  return token.classList.contains(JSED_TOKEN_COLLAPSED);
}

/**
 * Perform TOGGLE_COLLAPSE "on" on TOKEN.
 *
 * Tokens should be uncollapsed by default.  We can then choose to collapse.
 */
export function collapse(token: HTMLElement): HTMLElement {
  const val = token.firstChild!.nodeValue;
  if (!val) {
    throw new Error(`Invalid token: no string content detected`);
  }
  token.classList.add(JSED_TOKEN_COLLAPSED);
  if (val.endsWith(' ')) {
    token.firstChild!.nodeValue = val.trim();
    return token;
  }
  return token;
}

/**
 * Perform TOGGLE_COLLAPSE "off" on TOKEN.
 */
export function uncollapse(token: HTMLElement): HTMLElement {
  const val = token.firstChild!.nodeValue;
  if (!val) {
    throw new Error(`Invalid token: no string content detected`);
  }
  token.classList.remove(JSED_TOKEN_COLLAPSED);
  if (val.endsWith(' ')) {
    return token;
  }
  token.firstChild!.nodeValue += ' ';
  return token;
}

/**
 * Check if TOKEN is a PADDED_TOKEN.
 */
export function isPadded(token: HTMLElement): boolean {
  return token.classList.contains(JSED_TOKEN_PADDED);
}

/**
 * Convert to PADDED_TOKEN — add a leading space.
 *
 * TOKEN's are unpadded by default. PADDED_TOKEN is used when the previous
 * LINE_SIBLING doesn't carry its own trailing space (e.g. an ISLAND).
 */
export function pad(token: HTMLElement): HTMLElement {
  const val = token.firstChild!.nodeValue;
  if (!val) {
    throw new Error(`Invalid token: no string content detected`);
  }
  token.classList.add(JSED_TOKEN_PADDED);
  if (!val.startsWith(' ')) {
    token.firstChild!.nodeValue = ' ' + val;
  }
  return token;
}

/**
 * Convert PADDED_TOKEN to TOKEN — remove the leading space.
 */
export function unpad(token: HTMLElement): HTMLElement {
  const val = token.firstChild!.nodeValue;
  if (!val) {
    throw new Error(`Invalid token: no string content detected`);
  }
  token.classList.remove(JSED_TOKEN_PADDED);
  if (val.startsWith(' ')) {
    token.firstChild!.nodeValue = val.trimStart();
  }
  return token;
}

// #endregion

// #region Operations

export function joinNext(token: HTMLElement): void {
  const next = getNextTokenSibling(token);
  if (!next) {
    return;
  }
  const val = getValue(token);
  const nextVal = getValue(next);
  replaceText(token, val + nextVal);
  // Unpad before remove — the content has been absorbed, so padding
  // transfer would be incorrect.
  unpad(next);
  remove(next);
}

export function joinPrevious(token: HTMLElement): void {
  const prev = getPreviousTokenSibling(token);
  if (!prev) {
    return;
  }
  const val = getValue(token);
  const prevVal = getValue(prev);
  replaceText(token, prevVal + val);
  // Unpad before remove — the content has been absorbed, so padding
  // transfer would be incorrect.
  unpad(prev);
  remove(prev);
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
