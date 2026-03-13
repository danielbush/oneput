import {
  JSED_IMPLICIT_CLASS,
  JSED_ANCHOR_CHAR,
  JSED_ANCHOR_CLASS,
  JSED_TOKEN_CLASS,
  JSED_TOKEN_COLLAPSED
} from './constants.js';
import { canCreateWithAnchor } from './dom-rules.js';
import { isFocusable, isIgnorable } from './focus.js';
import { findNextNode, findPreviousNode } from './walk.js';

// #region utils

export function isSameLine(tok1: HTMLElement, tok2: HTMLElement): boolean {
  const line1 = getLine(tok1);
  const line2 = getLine(tok2);
  return line1 === line2;
}

/**
 * Detects INLINE's ie an FOCUSABLE is acting like an inline element eg an
 * em-tag .
 */
export function isPartOfLine(el: Node | ChildNode | ParentNode | null): boolean {
  if (!el) {
    throw new Error(`isInline called on null or undefined`);
  }
  if (isToken(el)) return true;
  if (!isFocusable(el)) return false;

  // This is an implicit line, it may be inline, but we treat it like a separate LINE.
  if (el.classList.contains(JSED_IMPLICIT_CLASS)) return false;

  const styles = window.getComputedStyle(el);
  if (!['none', ''].includes(styles.float)) {
    return false;
  }
  if (styles.display === 'inline') return true;
  if (styles.display === 'inline flow') return true;
  return false;
}

export function isToken2(el: EventTarget | Element | null | undefined): el is HTMLElement {
  return isToken(el);
}

/**
 * Detect if the element is a TOKEN .
 */
export function isToken(el: EventTarget | Element | null | undefined): boolean {
  const isHTMLElement = el instanceof window.HTMLElement;
  if (isHTMLElement) {
    return el.classList.contains(JSED_TOKEN_CLASS);
  }
  return false;
}

export function isAnchor(el: HTMLElement): boolean {
  return isToken(el) && el.classList.contains(JSED_ANCHOR_CLASS);
}

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
// #endregion

// #region Tokenization

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

/**
 * Used by tokenizer to convert text nodes to TOKEN's.
 */
function replaceTextNode(child: ParentNode | ChildNode): boolean {
  const el = child.parentNode;
  if (isToken(el)) {
    throw new Error(
      'replaceTextNode: called on existing token - this should not happen we should track what has been tokenized.'
    );
  }
  if (child.nodeType === Node.TEXT_NODE) {
    const tokens = child
      .nodeValue!.split(/\s+/)
      .filter(Boolean)
      .map((s) => createToken(s));
    const frag = document.createDocumentFragment();
    for (const token of tokens) {
      frag.appendChild(token);
      // frag.appendChild(createSpace());
    }
    el?.insertBefore(frag, child);
    el?.removeChild(child);
    return true;
  }
  return false;
}

/**
 * Recursively tokenize a LINE.
 */
function tokenizeLineRec(line: ParentNode | ChildNode): void {
  // Record childNodes before we mutate and convert to array as the NodeList is
  // live!
  const childNodes = Array.from(line.childNodes);
  for (const child of childNodes) {
    if (isToken(line)) {
      continue;
    }
    // Recurse into inline tags eg em-tag.
    // Be aware of INLINE_COMPUTED_STYLE .
    if (isPartOfLine(child)) {
      tokenizeLineRec(child);
    } else {
      replaceTextNode(child);
    }
  }
}

/**
 * Tokenize a LINE.
 */
export function tokenizeLine(el: HTMLElement): void {
  if (!isFocusable(el)) {
    throw new Error('Can only tokenize an FOCUSABLE');
  }
  el.normalize();
  tokenizeLineRec(el);
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
    if (sib.nodeType === Node.TEXT_NODE || isPartOfLine(sib)) {
      const nextSib: ChildNode | null = sib.nextSibling;
      implicitLine.appendChild(sib);
      sib = nextSib;
    } else {
      break;
    }
  }
  return implicitLine;
}

export function isImplicitLine(node: Node): boolean {
  return (
    node.nodeType === Node.ELEMENT_NODE &&
    (node as HTMLElement).className.includes(JSED_IMPLICIT_CLASS)
  );
}

/**
 * Find and handle IMPLICIT_LINE's.
 *
 * Run this on the whole doc at the beginning BEFORE any tokenization occurs.
 */
export function tagImplicitLines(root: HTMLElement) {
  for (const node of findNextNode(root, root, {
    filter: (node) => node?.nodeType === Node.ELEMENT_NODE
  })) {
    // if (isImplicitLine(node)) {
    //   // findNextNode may walk over the IMPLICIT_LINE we just created causing an
    //   // infinite loop.
    //   continue;
    // }
    for (let sib = node.firstChild; sib; ) {
      if (sib.nodeType === Node.TEXT_NODE || isPartOfLine(sib)) {
        // const implicitLine = buildImplicitLine(sib);
        // if (implicitLine) {
        //   sib = implicitLine.nextSibling;
        //   continue;
        // }

        const prev = sib.previousSibling;
        if (prev) {
          if (isFocusable(prev) && !isPartOfLine(prev)) {
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

// #region Operations on tokenized FOCUSABLE's

/**
 * Get the previous TOKEN SIBLING if there is one.  Siblings must be contiguous text tokens with NO intervening tags including inline tags.
 *
 * `el` may or may not be a TOKEN .  `el` might be an inline tag eg an em-tag.
 *
 * This is basically a souped up version of the DOM's
 * node.previousElementSibling.  We may need to handle undo and other weird
 * stuff, so we use a wrapper here.
 */
export function getPreviousSibling(el: HTMLElement): HTMLElement | null {
  let prev = el.previousElementSibling;
  while (prev && isIgnorable(prev)) {
    prev = prev.previousElementSibling;
  }
  if (isToken2(prev)) {
    return prev;
  }
  return null;
}

/**
 * Similar to getPreviousSibling but for the next SIBLING.
 */
export function getNextSibling(el: HTMLElement): HTMLElement | null {
  let next = el.nextElementSibling as HTMLElement | null;
  while (next && isIgnorable(next)) {
    next = next.nextElementSibling as HTMLElement | null;
  }
  if (isToken2(next)) {
    return next;
  }
  return null;
}

/**
 * Get previous LINE_SIBLING.
 */
export function getPreviousLineSibling(el: HTMLElement): HTMLElement | null {
  const line = getLine(el);
  for (const prev of findPreviousNode(el, line, {
    filter: isPartOfLine
  })) {
    if (isToken2(prev)) {
      return prev;
    }
  }
  return null;
}

/**
 * Get next LINE_SIBLING.
 */
export function getNextLineSibling(el: HTMLElement): HTMLElement | null {
  const line = getLine(el);
  for (const next of findNextNode(el, line, {
    filter: isPartOfLine
  })) {
    if (isToken2(next)) {
      return next;
    }
  }
  return null;
}

export function insertAfter(toInsert: HTMLElement, existing: HTMLElement): void {
  if (!existing.parentNode) {
    throw new Error('parentNode not found');
  }
  existing.insertAdjacentElement('afterend', toInsert);

  // Need to add an anchor?
  // const nexttok = getNextSibling(toInsert);
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
  // const prevtok = getPreviousSibling(toInsert);
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
  let content = val;
  if (isCollapsed(token)) {
    content = val.trim();
  } else {
    content = val.endsWith(' ') ? val : val + ' ';
  }
  token.firstChild!.nodeValue = content;
  return token;
}

export function isCollapsed(token: HTMLElement): boolean {
  return token.classList.contains(JSED_TOKEN_COLLAPSED);
}

/**
 * Perform COLLAPSE on token.
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
 * Un-COLLAPSE token.
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

export function joinNext(token: HTMLElement): void {
  const next = getNextSibling(token);
  if (!next) {
    return;
  }
  const val = getValue(token);
  const nextVal = getValue(next);
  replaceText(token, val + nextVal);
  remove(next);
}

export function joinPrevious(token: HTMLElement): void {
  const prev = getPreviousSibling(token);
  if (!prev) {
    return;
  }
  const val = getValue(token);
  const prevVal = getValue(prev);
  replaceText(token, prevVal + val);
  remove(prev);
}

/**
 * Move anything before `token` to a new parent before the current parent (SPLIT_BY_TOKEN).
 */
export function splitBefore(token: HTMLElement): HTMLElement[] {
  const prevTok = getPreviousSibling(token);
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
  const nextTok = getNextSibling(token);
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

  // Grab this if it exists before we delete...
  const nextTok = getNextSibling(token) || getPreviousSibling(token);

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

export function getValue(token: HTMLElement): string {
  validate(token);
  if (isAnchor(token)) {
    return JSED_ANCHOR_CHAR;
  }
  return token.firstChild!.nodeValue?.trim() as string;
}

/**
 * Find the LINE associated with `el`.  Usually `el` should be a text node, TOKEN or inline FOCUSABLE .  May return `el` itself if not.
 */
export function getLine(el: ChildNode): HTMLElement {
  if (!el) {
    throw new Error(`getLine: element is null`);
  }
  for (let p: ParentNode | ChildNode | null = el; ; p = p?.parentNode) {
    if (!p) {
      throw new Error(`getLine: expected parentNode to exist`);
    }
    if (isFocusable(p)) {
      if (isPartOfLine(p)) {
        continue;
      }
      return p;
    }
  }
  throw new Error(`getLine: end of for-loop`);
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
  if (isToken(el)) {
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
