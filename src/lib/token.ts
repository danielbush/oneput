import { JSED_TOKEN_CLASS } from './constants';

/**
 * Detect if the element is a TOKEN .
 */
export function isToken(
  el: EventTarget | Element | null | undefined,
): el is HTMLElement {
  const isHTMLElement = el instanceof window.HTMLElement;
  if (isHTMLElement) {
    return el.classList.contains(JSED_TOKEN_CLASS);
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

function createSpace(): Text {
  return document.createTextNode(' ');
}
/**
 * Tokenize the text of an F_ELEM.  Only direct descendent text.
 */
export function tokenize(el: HTMLElement): void {
  el.normalize();
  for (let child = el.firstChild; child; child = child.nextSibling) {
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
      el.insertBefore(frag, child);
      el.removeChild(child);
    }
  }
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
function validate(token: HTMLElement): void {
  if (!token.firstChild) {
    throw new Error('token has not text');
  }
  if (token.firstChild.nodeType !== Node.TEXT_NODE) {
    throw new Error('first child should be a text node');
  }
}

export function replaceText(token: HTMLElement, val: string) {
  validate(token);
  token.firstChild!.nodeValue = val;
}
