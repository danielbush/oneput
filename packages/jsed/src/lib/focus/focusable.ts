import { canCreateWithAnchor } from '../core/dom-rules.js';
import * as domRules from '../core/dom-rules.js';
import { getNextNodeSibling, getPreviousNodeSibling } from '../core/sibling.js';
import {
  isFocusable,
  isInlineFlow,
  isIsland,
  isToken,
  JSED_FOCUS_CLASS
} from '../core/taxonomy.js';
import * as token from '../token/token.js';
import { findNextNode, findPreviousNode } from '../core/walk.js';

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

export function getAppendCandidates(parent: HTMLElement): string[] {
  return domRules.getAllowableChildTags(parent.tagName);
}

export function isEmpty(el: Element): boolean {
  if (!el.firstChild) {
    return true;
  }
  if (isFocusable(el.firstChild)) {
    return false;
  }
  if (isToken(el.firstChild)) {
    return false;
  }
  return !getNextNodeSibling(el.firstChild);
}

/**
 * Append new child element (tagName) to parent.
 */
export function appendNew(parent: HTMLElement, tagName: string): HTMLElement | null {
  if (!domRules.getAllowableChildTags(parent.tagName).includes(tagName.toLowerCase())) {
    return null;
  }

  const inserted = createElement(tagName);
  parent.appendChild(inserted);
  return inserted;
}

export function getInsertAfterCandidates(el: HTMLElement): string[] {
  return domRules.getAllowableInsertAfterTags(el.tagName);
}

export function insertNewAfter(tagName: string, target: HTMLElement): HTMLElement | null {
  if (!domRules.getAllowableInsertAfterTags(target.tagName).includes(tagName.toLowerCase())) {
    return null;
  }

  const inserted = createElement(tagName);
  target.insertAdjacentElement('afterend', inserted);
  return inserted;
}

export function getInsertBeforeCandidates(el: HTMLElement): string[] {
  return domRules.getAllowableInsertBeforeTags(el.tagName);
}

export function insertNewBefore(tagName: string, target: HTMLElement): HTMLElement | null {
  if (!domRules.getAllowableInsertAfterTags(target.tagName).includes(tagName.toLowerCase())) {
    return null;
  }

  const inserted = createElement(tagName);
  target.insertAdjacentElement('beforebegin', inserted);
  return inserted;
}

export function deleteElement(el: HTMLElement): void {
  el.remove();
}

/**
 * Delete el and anestors if they have no other content.
 *
 * Algorithm:
 * If isEmpty(el) delete it.
 * If el's parent is now empty, delete it.
 * ... etc
 * However... we only delete once at the very end to keep everything intact.
 * `highest` is a child of p, and we scan either side to see if the element would have been empty.
 */
export function deleteHighestEmptyTree(el: Element, ceiling?: Element) {
  if (!isEmpty(el)) {
    return;
  }

  let highest = el;

  for (let parent = el.parentElement; parent && parent !== ceiling; parent = parent.parentElement) {
    const wouldBeEmptyWithoutChild =
      // highest.parentElement === parent &&
      !getPreviousNodeSibling(highest) && !getNextNodeSibling(highest);

    if (!wouldBeEmptyWithoutChild) {
      break;
    }
    highest = parent;
  }

  highest.remove();
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

// export type FocusElementInsertion = {
//   focus: HTMLElement;
//   tagName: string;
// };

// export function getFocusElementInsertion(
//   focus: HTMLElement | null,
//   tagName?: string
// ): FocusElementInsertion | null {
//   if (!focus || !focus.parentElement) {
//     return null;
//   }

//   const normalized = domRules.normalizeTagName(tagName ?? focus.tagName);
//   if (!normalized || !canContainChildTag(focus.parentElement.tagName, normalized)) {
//     return null;
//   }

//   return { focus, tagName: normalized };
// }

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

export function pasteBefore(pasted: HTMLElement, before: HTMLElement): HTMLElement | null {
  return before.insertAdjacentElement('beforebegin', pasted) as HTMLElement | null;
}

export function pasteCopyBefore(pasted: HTMLElement, before: HTMLElement): HTMLElement | null {
  const copy = pasted.cloneNode(true) as HTMLElement;
  return before.insertAdjacentElement('beforebegin', copy) as HTMLElement | null;
}

export function pasteAfter(pasted: HTMLElement, after: HTMLElement): HTMLElement | null {
  return after.insertAdjacentElement('afterend', pasted) as HTMLElement | null;
}

export function pasteCopyAfter(pasted: HTMLElement, after: HTMLElement): HTMLElement | null {
  const copy = pasted.cloneNode(true) as HTMLElement;
  return after.insertAdjacentElement('afterend', copy) as HTMLElement | null;
}

export function pasteWithin(pasted: HTMLElement, within: HTMLElement): HTMLElement | null {
  return within.insertAdjacentElement('beforeend', pasted) as HTMLElement | null;
}

export function pasteCopyWithin(pasted: HTMLElement, within: HTMLElement): HTMLElement | null {
  const copy = pasted.cloneNode(true) as HTMLElement;
  return within.insertAdjacentElement('beforeend', copy) as HTMLElement | null;
}

export function copyEmptyNext(target: HTMLElement): HTMLElement | null {
  if (isInlineFlow(target)) {
    // Use cursor ops eg wrap text in em; copying empty after would be weird
    return null;
  }
  const empty = target.cloneNode(false) as HTMLElement;
  empty.classList.remove(JSED_FOCUS_CLASS);
  target.insertAdjacentElement('afterend', empty);
  if (canCreateWithAnchor(empty.tagName)) {
    token.addAnchors(empty);
  }
  return empty;
}

export function copyEmptyPrevious(target: HTMLElement): HTMLElement | null {
  if (isInlineFlow(target)) {
    // Use cursor ops eg wrap text in em; copying empty after would be weird
    return null;
  }
  const empty = target.cloneNode(false) as HTMLElement;
  empty.classList.remove(JSED_FOCUS_CLASS);
  target.insertAdjacentElement('beforebegin', empty);
  if (canCreateWithAnchor(empty.tagName)) {
    token.addAnchors(empty);
  }
  return empty;
}
