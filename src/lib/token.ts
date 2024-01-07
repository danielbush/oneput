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
