import { canContainChildTag, canCreateWithAnchor, getDefaultInsertChildTag } from './dom-rules.js';
import * as domRules from './dom-rules.js';
import { isFocusable, isIsland } from './taxonomy.js';
import * as token from './token.js';
import { findNextNode, findPreviousNode } from './walk.js';

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
 * Find the next FOCUSABLE after `el`, skipping everything inside `el`.
 */
export function findNextFocusableOutside(el: Node, ceiling: HTMLElement): HTMLElement | null {
  for (const next of findNextNode(el, ceiling, {
    visit: isFocusable,
    descend: (node) => !isIsland(node) && node !== el
  })) {
    return next as HTMLElement;
  }
  return null;
}

/**
 * Find the previous FOCUSABLE before `el`, skipping everything inside `el`.
 */
export function findPreviousFocusableOutside(el: Node, ceiling: HTMLElement): HTMLElement | null {
  for (const previous of findPreviousNode(el, ceiling, {
    visit: isFocusable,
    descend: (node) => !isIsland(node)
  })) {
    return previous as HTMLElement;
  }

  return null;
}

export type FocusElementInsertion = {
  focus: HTMLElement;
  tagName: string;
};

export type FocusElementChildInsertion = {
  parent: HTMLElement;
  tagName: string;
};

export function getFocusElementInsertion(
  focus: HTMLElement | null,
  tagName?: string
): FocusElementInsertion | null {
  if (!focus || !focus.parentElement) {
    return null;
  }

  const normalized = domRules.normalizeTagName(tagName ?? focus.tagName);
  if (!normalized || !canContainChildTag(focus.parentElement.tagName, normalized)) {
    return null;
  }

  return { focus, tagName: normalized };
}

export function getFocusElementChildInsertion(
  parent: HTMLElement | null,
  tagName?: string
): FocusElementChildInsertion | null {
  if (!parent) {
    return null;
  }

  const defaultTagName = getDefaultInsertChildTag(parent.tagName);
  const normalized = domRules.normalizeTagName(tagName ?? defaultTagName ?? '');
  if (!normalized || !canContainChildTag(parent.tagName, normalized)) {
    return null;
  }

  return { parent, tagName: normalized };
}

export function unwrap(el: HTMLElement): void {
  el.replaceWith(...Array.from(el.childNodes));
}

export function convert(el: HTMLElement, toTagName: string): HTMLElement {
  const newEl = el.ownerDocument.createElement(toTagName);
  el.before(newEl);
  newEl.append(...Array.from(el.childNodes));
  el.remove();
  return newEl;
}

export function getConversionCandidates(el: HTMLElement | null, root: HTMLElement): string[] {
  if (!el) {
    return [];
  }
  if (!root.contains(el)) {
    return [];
  }
  return domRules.getConversionCandidates(el);
}
