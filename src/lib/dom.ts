import { canCreateWithAnchor } from './dom-rules';
import * as token from './token';

export function copyElement(el: HTMLElement, newTagName?: string): HTMLElement {
  newTagName = newTagName || el.tagName;
  const newElement = document.createElement(newTagName);

  // Copy all attributes from the old element to the new element
  for (let i = 0; i < el.attributes.length; i++) {
    const attr = el.attributes[i];
    newElement.setAttribute(attr.name, attr.value);
  }

  // Move all children from the old element to the new element
  while (el.firstChild) {
    newElement.appendChild(el.firstChild);
  }

  return newElement;
}

export function replaceElement(
  old: HTMLElement,
  newElement: HTMLElement,
): void {
  if (!old.parentNode) {
    throw new Error('replaceElement: Element has no parent');
  }
  old.parentNode.replaceChild(newElement, old);
}

export function createElement(tagName: string): HTMLElement {
  const el = document.createElement(tagName);
  if (canCreateWithAnchor(tagName)) {
    token.addAnchors(el);
  }
  return el;
}

export function insertAfter(el: HTMLElement, newElement: HTMLElement): void {
  el.insertAdjacentElement('afterend', newElement);
}

export function insertBefore(el: HTMLElement, newElement: HTMLElement): void {
  el.insertAdjacentElement('beforebegin', newElement);
}

export function deleteElement(el: HTMLElement): void {
  el.remove();
}
