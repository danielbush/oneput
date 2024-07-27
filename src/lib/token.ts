import {
  JSED_IMPLICIT_CLASS,
  JSED_ANCHOR_CHAR,
  JSED_ANCHOR_CLASS,
  JSED_TOKEN_CLASS,
  JSED_TOKEN_COLLAPSED,
} from './constants';
import { canCreateWithAnchor } from './dom-rules';
import { ignoreDescendents, isFocusable, isIgnorable } from './focus';
import { findNextNode, findPreviousNode } from './walk';

// #region utils

export function isSameLine(tok1: HTMLElement, tok2: HTMLElement): boolean {
  const line1 = getLine(tok1);
  const line2 = getLine(tok2);
  return line1 === line2;
}

/**
 * Detect if an F_ELEM is acting like an inline element eg an em-tag - such
 * elements are considered part of the visual line of text.
 */
export function isPartOfLine(
  el: Node | ChildNode | ParentNode | null,
): boolean {
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

export function isToken2(
  el: EventTarget | Element | null | undefined,
): el is HTMLElement {
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
      'getParent: token has no parentElement is it attached to the dom or is it an HTML element?',
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
 * Create a ANCHOR
 *
 * This is a token that contains text that represents a text anchor.  We add an
 * additional class to help detect it.
 */
export function createAnchor(): HTMLElement {
  const el = createToken(JSED_ANCHOR_CHAR);
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
      'replaceTextNode: called on existing token - this should not happen we should track what has been tokenized.',
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
 * Tokenize all the child text nodes in an F_ELEM .
 */
function tokenizeShallow(el: ParentNode | ChildNode): void {
  // el.normalize();
  // Record childNodes before we mutate and convert to array as the NodeList is
  // live!
  const childNodes = Array.from(el.childNodes);
  for (const child of childNodes) {
    if (isToken(el)) {
      continue;
    }
    // Recurse into inline tags eg em-tag.
    // Be aware of INLINE_COMPUTED_STYLE .
    if (isPartOfLine(child)) {
      tokenizeShallow(child);
    } else {
      replaceTextNode(child);
    }
  }
}

/**
 * Depth first traversal of F_ELEM's, each F_ELEM is horizontally tokenized with tokenizeShallow.
 */
function tokenizeLine(root: HTMLElement): void {
  if (!isFocusable(root)) {
    throw new Error('Can only tokenize an F_ELEM');
  }
  root.normalize();
  tokenizeShallow(root);
  // for (const el of findNextNode(root, ceiling, {
  //   filter: (el) => {
  //     if (!el) {
  //       return false;
  //     }
  //     if (isToken(el)) {
  //       return false;
  //     }
  //     return (
  //       // Allow text nodes to ensure we capture things like 'foo <em>bar</em> baz'.
  //       el.nodeType === Node.ELEMENT_NODE || el.nodeType === Node.TEXT_NODE
  //     );
  //   },
  // })) {
  //   tokenizeShallow(el);
  // }
}

/**
 * Tokenize the text of an F_ELEM.
 */
export function tokenize(el: HTMLElement): void {
  const line = getLine(el);
  tokenizeLine(line);
}

/**
 * Find and handle IMPLICIT_LINE's.
 *
 * Run this on the whole doc at the beginning BEFORE any tokenization occurs.
 */
export function tokenizeImplicitLine(root: HTMLElement) {
  const buildImplicitLine = (node: Node): HTMLElement | null => {
    if (!node.parentNode) {
      throw new Error(`Expected node to have parent.`);
    }
    node.parentNode.normalize(); // ok, so really there is just one text node now...
    if (!node.nodeValue || /^\s+$/.test(node.nodeValue)) {
      // Space nodes are generated between tags as an artifact of the html source.
      // Ignore these.
      return null;
    }

    const implicitLine = document.createElement('span');
    implicitLine.className = JSED_IMPLICIT_CLASS;
    node.parentNode.insertBefore(implicitLine, node);

    for (let sib: Node | null = node; sib; ) {
      if (sib.nodeType === Node.TEXT_NODE || isPartOfLine(sib)) {
        const nextSib: ChildNode | null = sib.nextSibling;
        implicitLine.appendChild(sib);
        sib = nextSib;
      } else {
        break;
      }
    }
    return implicitLine;
  };
  for (const node of findNextNode(root, root, {
    filter: (node) => node?.nodeType === Node.ELEMENT_NODE,
  })) {
    for (let sib = node.firstChild; sib; ) {
      if (sib.nodeType === Node.TEXT_NODE || isPartOfLine(sib)) {
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

// #region Operations on tokenized F_ELEM's

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
    filter: isPartOfLine,
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
    filter: isPartOfLine,
  })) {
    if (isToken2(next)) {
      return next;
    }
  }
  return null;
}

export function insertAfter(
  toInsert: HTMLElement,
  existing: HTMLElement,
): void {
  if (!existing.parentNode) {
    throw new Error('parentNode not found');
  }
  existing.insertAdjacentElement('afterend', toInsert);

  // Need to add an anchor?
  const nexttok = getNextSibling(toInsert);
  if (!nexttok) {
    const anchor = createAnchor();
    toInsert.insertAdjacentElement('afterend', anchor);
  }
}

export function insertBefore(
  toInsert: HTMLElement,
  existing: HTMLElement,
): void {
  if (!existing.parentNode) {
    throw new Error('parentNode not found');
  }
  existing.insertAdjacentElement('beforebegin', toInsert);

  // Need to add an anchor?
  const prevtok = getPreviousSibling(toInsert);
  if (!prevtok) {
    const anchor = createAnchor();
    toInsert.insertAdjacentElement('beforebegin', anchor);
  }
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
 * manage the TOKEN_FOCUS and cursor operations - we only call focus when we
 * create a new token eg after deleting the current TOKEN_FOCUS and only in
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
 * Remove the token and return the nearest token in the same LINE.
 *
 * @param params.keepAnchor If the token has no immediate siblings around it under the same parent element, then insert a ANCHOR .
 */
export function remove(
  token: HTMLElement,
  params: { keepAnchor: boolean } = { keepAnchor: true },
): void {
  const parentNode = token.parentNode;
  if (!parentNode) {
    throw new Error('remove: token has no parentNode');
  }
  // TODO: hm, this seems expensive having to calculate all these up front...
  const prevTok = getPreviousSibling(token);
  const nextTok = getNextSibling(token);
  const prevEl = token.previousElementSibling;
  const nextEl = token.nextElementSibling;
  parentNode.removeChild(token);
  if (prevTok || nextTok) {
    return;
  }
  // We're out of text, we need to add a ANCHOR for the appropriate
  // LINE_SEGMENT .
  if (!params?.keepAnchor) {
    return;
  }
  const anchor = createAnchor();
  if (prevEl) {
    insertAfter(anchor, prevEl as HTMLElement);
    return;
  }
  if (nextEl) {
    insertBefore(anchor, nextEl as HTMLElement);
    return;
  }
  parentNode.appendChild(anchor);
  return;
}

export function getValue(token: HTMLElement): string {
  validate(token);
  if (isAnchor(token)) {
    return JSED_ANCHOR_CHAR;
  }
  return token.firstChild!.nodeValue?.trim() as string;
}

/**
 * Find the LINE associated with `el`.  Usually `el` should be a text node, TOKEN or inline F_ELEM .  May return `el` itself if not.
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
 * Walks el (an F_ELEM usually) and looks for the first text token we can focus
 * on.  This will tokenize as it recurses down depth-first.
 */
export function getFirstToken(el: HTMLElement): HTMLElement | null {
  if (isToken(el)) {
    return el;
  }
  if (!isFocusable(el)) {
    throw new Error('getFirstToken: expects an F_ELEM');
  }
  const line = el;
  // const line = getLine(el);
  tokenize(line);
  const sib = getNextLineSibling(line);
  if (sib) {
    return sib;
  }
  for (const next of findNextNode(line, line, {
    filter: isFocusable,
    ignoreDescendents,
  })) {
    tokenize(next as HTMLElement);
    const sib = getNextLineSibling(next as HTMLElement);
    if (sib) {
      return sib;
    }
  }
  return null;
}

/**
 * Add ANCHOR's where applicable to the F_ELEM.
 *
 * Existing ANCHOR's are unchanged.  Only direct descendant ANCHOR's of
 * the F_ELEM are inserted (no recursion).
 *
 * If the user has deleted an anchor with the intention of never adding text to the related LINE_SEGMENT, this function will put it back.
 */
export function addAnchors(el: HTMLElement): HTMLElement[] {
  if (isToken(el)) {
    throw new Error('addAnchors: expects an F_ELEM');
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
