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

/**
 * Tokenize the text of an F_ELEM.
 */
export function tokenize(el: HTMLElement): void {
  if (el.innerText && el.innerText.length > 0) {
    el.normalize();
    const first = el.firstChild;
    if (first?.nodeType === Node.TEXT_NODE) {
      const tokens = first
        .nodeValue!.split(/\s+/)
        .filter(Boolean)
        .map((s) => createToken(s));
      const frag = document.createDocumentFragment();
      for (const token of tokens) {
        frag.appendChild(token);
        frag.appendChild(document.createTextNode(' '));
      }
      el.insertBefore(frag, first);
      el.removeChild(first);
    }
  }
}
