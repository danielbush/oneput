import { JSED_PLACEHOLDER_TOKEN_CLASS, JSED_TOKEN_CLASS } from './constants';
import { isFocusable } from './focus';
import { findNextNode, findPreviousNode } from './walk';

/**
 * Detect if an F_ELEM is an inline element.
 */
export function isInline(el: ChildNode | ParentNode): boolean {
  if (!isFocusable(el)) return false;
  const styles = window.getComputedStyle(el);
  if (styles.float !== 'none') {
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
    return (
      el.classList.contains(JSED_TOKEN_CLASS) ||
      el.classList.contains(JSED_PLACEHOLDER_TOKEN_CLASS)
    );
  }
  return false;
}

export function isPlaceholderToken(el: HTMLElement): boolean {
  const isHTMLElement = el instanceof window.HTMLElement;
  if (isHTMLElement) {
    return el.classList.contains(JSED_PLACEHOLDER_TOKEN_CLASS);
  }
  return false;
}

// #region Tokenization

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
 * Create a PLACHOLDER_TOKEN
 */
export function createPlaceholderToken(): HTMLElement {
  const el = document.createElement('span');
  el.classList.add(JSED_PLACEHOLDER_TOKEN_CLASS);
  el.appendChild(document.createTextNode('§'));
  return el;
}

// function createSpace(): Text {
//   return document.createTextNode(' ');
// }

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
function tokenizeShallow(
  el: ParentNode | ChildNode,
  tokenized?: WeakMap<ParentNode | ChildNode, boolean>,
): void {
  if (tokenized?.has(el)) {
    return;
  }
  // el.normalize();
  tokenized?.set(el, true);
  for (let child = el.firstChild; child; child = child.nextSibling) {
    replaceTextNode(child);
  }
}

/**
 * Depth first traversal of F_ELEM's, each F_ELEM is horizontally tokenized with tokenizeShallow.
 */
function tokenizeRec(
  root: HTMLElement,
  ceiling: Node,
  tokenized?: WeakMap<ParentNode | ChildNode, boolean>,
): void {
  if (!isFocusable(root)) {
    throw new Error('Can only tokenize an F_ELEM');
  }
  root.normalize();
  tokenizeShallow(root);
  for (const el of findNextNode(root, ceiling, {
    ignore: (el) => {
      if (!el) {
        return true;
      }
      if (isToken(el)) {
        return true;
      }
      if (el.nodeType === Node.TEXT_NODE) {
        return true;
      }
      return el.nodeType !== Node.ELEMENT_NODE;
    },
  })) {
    tokenizeShallow(el, tokenized);
  }
  tokenized?.set(root, true);
}

/**
 * Tokenize the text of an F_ELEM.  Only direct descendent text.
 */
export function tokenize(
  el: HTMLElement,
  tokenized?: WeakMap<HTMLElement, boolean>,
): void {
  const ceiling = getLine(el);
  tokenizeRec(ceiling, ceiling, tokenized);
}

// #endregion

// #region Operations on tokenized F_ELEM's

/**
 * Get previous contiguous or inline TOKEN.
 */
export function getPreviousSibling(el: HTMLElement): HTMLElement | null {
  // This will walk TOKEN's because we're not setting ignore / ignoreDescendents
  for (const prev of findPreviousNode(el, getLine(el))) {
    if (isToken2(prev)) {
      return prev;
    }
  }
  return null;
}

/**
 * Get next contiguous or inline TOKEN.
 */
export function getNextSibling(el: HTMLElement): HTMLElement | null {
  // This will walk TOKEN's because we're not setting ignore / ignoreDescendents
  for (const next of findNextNode(el, getLine(el))) {
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
  existing.parentNode.insertBefore(toInsert, existing.nextSibling);
  // const spc = createSpace();
  // existing.parentNode.insertBefore(spc, existing.nextSibling);
  // existing.parentNode.insertBefore(toInsert, spc.nextSibling);
}

/**
 * Assumes `isToken` is true, but checks for weird invalid states that might occur
 */
function validate(token: HTMLElement, allowPlaceholder: boolean = false): void {
  if (!allowPlaceholder && isPlaceholderToken(token)) {
    throw new Error('placeholder tokens not allowed');
  }
  if (allowPlaceholder && isPlaceholderToken(token)) {
    if (token.firstChild?.nodeValue !== '§') {
      throw new Error('placeholder token should be empty');
    }
    return;
  }
  if (!token.firstChild) {
    throw new Error('token has no text');
  }
  if (token.firstChild.nodeType !== Node.TEXT_NODE) {
    throw new Error('first child should be a text node');
  }
}

export function replaceText(token: HTMLElement, val: string): HTMLElement {
  validate(token, true);
  if (isPlaceholderToken(token)) {
    const tok = createToken(val);
    token.replaceWith(tok);
    return tok;
  }
  token.firstChild!.nodeValue = val;
  return token;
}

export function remove(token: HTMLElement) {
  const parentNode = token.parentNode;
  if (!parentNode) {
    throw new Error('remove: token has no parentNode');
  }
  let other = getPreviousSibling(token);
  if (!other) {
    other = getNextSibling(token);
  }
  parentNode.removeChild(token);
  if (other) {
    return other;
  }
  const pholder = createPlaceholderToken();
  parentNode.appendChild(pholder);
  return pholder;
}

export function getValue(token: HTMLElement): string {
  validate(token, true);
  if (isPlaceholderToken(token)) {
    return '';
  }
  return token.firstChild!.nodeValue as string;
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
      if (isInline(p)) {
        continue;
      }
      return p;
    }
  }
  throw new Error(`getLine: end of for-loop`);
}

// #endregion
