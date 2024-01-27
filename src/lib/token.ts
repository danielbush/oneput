import { JSED_PLACEHOLDER_TOKEN_CLASS, JSED_TOKEN_CLASS } from './constants';
import { isFocusable } from './focus';
import { walkIter } from './walk';

/**
 * Detect if the element is a TOKEN .
 */
export function isToken(
  el: EventTarget | Element | null | undefined,
): el is HTMLElement {
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

function createSpace(): Text {
  return document.createTextNode(' ');
}

function replaceTextNode(child: ChildNode): boolean {
  const el = child.parentNode;
  if (child.nodeType === Node.TEXT_NODE) {
    const tokens = child
      .nodeValue!.split(/\s+/)
      .filter(Boolean)
      .map((s) => createToken(s));
    const frag = document.createDocumentFragment();
    for (const token of tokens) {
      frag.appendChild(token);
      frag.appendChild(createSpace());
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
  el: HTMLElement,
  tokenized?: WeakMap<HTMLElement, boolean>,
): void {
  if (tokenized?.has(el)) {
    return;
  }
  el.normalize();
  tokenized?.set(el, true);
  for (let child = el.firstChild; child; child = child.nextSibling) {
    replaceTextNode(child);
  }
}

function tokenizeRec(
  root: HTMLElement,
  tokenized?: WeakMap<HTMLElement, boolean>,
): void {
  if (!isFocusable(root)) {
    throw new Error('Can only tokenize an F_ELEM');
  }
  tokenizeShallow(root, tokenized);
  tokenized?.set(root, true);
  for (const el of walkIter(root, root)) {
    tokenizeShallow(el, tokenized);
    tokenized?.set(el, true);
  }
}

/**
 * Tokenize the text of an F_ELEM.  Only direct descendent text.
 */
export function tokenize(
  el: HTMLElement,
  tokenized?: WeakMap<HTMLElement, boolean>,
): void {
  // tokenizeShallow(el, tokenized);
  tokenizeRec(el, tokenized);
}

export function getPreviousSibling(el: HTMLElement): HTMLElement | null {
  const prev = el.previousElementSibling;
  if (prev && isToken(prev)) {
    return prev;
  }
  return null;
}

export function getNextSibling(el: HTMLElement): HTMLElement | null {
  const next = el.nextElementSibling;
  if (next && isToken(next)) {
    return next;
  }
  // here
  return null;
}

export function insertAfter(
  toInsert: HTMLElement,
  existing: HTMLElement,
): void {
  const spc = createSpace();
  if (!existing.parentNode) {
    throw new Error('parentNode not found');
  }
  existing.parentNode.insertBefore(spc, existing.nextSibling);
  existing.parentNode.insertBefore(toInsert, spc.nextSibling);
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
