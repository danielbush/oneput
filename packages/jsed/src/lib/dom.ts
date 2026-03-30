import { canCreateWithAnchor } from './dom-rules.js';
import * as token from './token.js';

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

export function replaceElement(old: HTMLElement, newElement: HTMLElement): void {
  if (!old.parentNode) {
    throw new Error('replaceElement: Element has no parent');
  }
  old.parentNode.replaceChild(newElement, old);
}

export function createElement(
  tagName: string,
  options: { addAnchors: boolean } = { addAnchors: true }
): HTMLElement {
  const el = document.createElement(tagName);
  if (options.addAnchors && canCreateWithAnchor(tagName)) {
    token.addAnchors(el);
  }
  return el;
}

export function insertAfter(newElement: HTMLElement, el: HTMLElement): void {
  el.insertAdjacentElement('afterend', newElement);
}

export function insertBefore(newElement: HTMLElement, el: HTMLElement): void {
  el.insertAdjacentElement('beforebegin', newElement);
}

export function deleteElement(el: HTMLElement): void {
  el.remove();
}

export function splitParentBefore(el: HTMLElement): void {
  const parent = el.parentElement;
  if (!parent) {
    throw new Error('splitParentBefore: Element has no parent');
  }
  const prevPar = createElement(parent.tagName, {
    addAnchors: false
  }) as HTMLElement;
  parent.insertAdjacentElement('beforebegin', prevPar);
  for (let sib = el.previousSibling; sib; ) {
    const prevSib = sib.previousSibling;
    prevPar.insertBefore(sib, prevPar.firstChild);
    sib = prevSib;
  }
}

/**
 * Only scroll elements into view if they are smaller than the viewport.
 */
export function scrollIntoViewIfSmaller(
  el: HTMLElement,
  opts?: { vertical?: 'nearest' | 'start' | 'center' | 'end' }
) {
  const vp = window.visualViewport;
  const vpWidth = vp?.width ?? window.innerWidth;
  const vpHeight = vp?.height ?? window.innerHeight;
  const rect = el.getBoundingClientRect();
  if (rect.height <= vpHeight && rect.width <= vpWidth) {
    el.scrollIntoView({ block: opts?.vertical ?? 'center', inline: 'nearest', behavior: 'smooth' });
  }
}
