import { canCreateWithAnchor } from '../core/dom-rules.js';
import * as domRules from '../core/dom-rules.js';
import { getNextNodeSibling, getNextSibling, getPreviousNodeSibling } from '../core/sibling.js';
import {
  isAnchor,
  isFocusable,
  isIgnorableNode,
  isImplicitLine,
  isInlineFlow,
  isIsland,
  JSED_DELETED_CLASS,
  JSED_FOCUS_CLASS,
  JSED_IGNORE_CLASS
} from '../core/taxonomy.js';
import { findNextNode, findPreviousNode } from '../core/walk.js';
import { createImplicitLine } from './implicitLine.js';
import { anchorize } from './anchor.js';

export function createElement(
  tagName: string,
  options: { addAnchors: boolean } = { addAnchors: true }
): HTMLElement {
  const el = document.createElement(tagName);
  if (options.addAnchors && canCreateWithAnchor(tagName)) {
    anchorize(el);
  }
  return el;
}

export function getAppendCandidates(parent: HTMLElement): string[] {
  return domRules.getAllowableChildTags(parent.tagName);
}

export function isEmpty(el: Node): boolean {
  // if (ignoreAnchor) {
  const sib = getNextSibling(
    el.firstChild,
    (node) => !isAnchor(node) && !isIgnorableNode(node),
    true
  );
  return !sib;
  // }
  // const sib = getNextSibling(el.firstChild, (node) => !isIgnorableNode(node), true);
  // return !sib;
}

/**
 * Like isEmpty, but for needle.
 */
export function containsOnly(container: Node, needle: Node): boolean {
  return Array.from(container.childNodes).every((child) => {
    if (child === needle) return true;
    return isAnchor(child) || isIgnorableNode(child);
  });
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

export type InsertElementAfter = {
  action: 'insert-element-after';
  element: HTMLElement; // the newly inserted element
  target: HTMLElement; // the anchor we insert after
};

export function insertNewAfter(tagName: string, target: HTMLElement): InsertElementAfter | null {
  if (!domRules.getAllowableInsertAfterTags(target.tagName).includes(tagName.toLowerCase())) {
    return null;
  }

  const element = createElement(tagName);
  target.insertAdjacentElement('afterend', element);
  return { action: 'insert-element-after', element, target };
}

export function undoInsertElementAfter(op: InsertElementAfter) {
  // element is freshly created + empty; target stays as the redo anchor.
  op.element.remove();
}

export function redoInsertElementAfter(op: InsertElementAfter) {
  op.target.insertAdjacentElement('afterend', op.element);
}

export function getInsertBeforeCandidates(el: HTMLElement): string[] {
  return domRules.getAllowableInsertBeforeTags(el.tagName);
}

export function insertNewBefore(tagName: string, target: HTMLElement): HTMLElement | null {
  if (!domRules.getAllowableInsertBeforeTags(target.tagName).includes(tagName.toLowerCase())) {
    return null;
  }

  const inserted = createElement(tagName);
  target.insertAdjacentElement('beforebegin', inserted);
  return inserted;
}

export function createElementDeleteMarker() {
  const container = document.createElement('template');
  container.classList.add(JSED_DELETED_CLASS);
  container.classList.add(JSED_IGNORE_CLASS);
  return container;
}

export type DeleteElement = {
  action: 'delete-element';
  marker: HTMLElement;
  element: HTMLElement;
};

export function deleteElement(el: HTMLElement): DeleteElement {
  const marker = createElementDeleteMarker();
  el.before(marker);
  el.remove();
  return {
    action: 'delete-element',
    marker: marker,
    element: el
  };
}

export function undoDeleteElement(op: DeleteElement) {
  op.marker.before(op.element);
  op.marker.remove();
}

export function redoDeleteElement(op: DeleteElement) {
  op.element.before(op.marker);
  op.element.remove();
}

/**
 * Delete el and anestors if they have no other content up to but excluding ceiling.
 *
 * Algorithm:
 * If isEmpty(el) delete it.
 * If el's parent is now empty, delete it.
 * ... etc
 * However... we only delete once at the very end to keep everything intact.
 * `highest` is a child of p, and we scan either side to see if the element would have been empty.
 */
export function deleteHighestEmpty(el: HTMLElement, ceiling?: Element, ignore?: HTMLElement) {
  if (ignore ? !containsOnly(el, ignore) : !isEmpty(el)) {
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

  return deleteElement(highest);
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
    anchorize(empty);
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
    anchorize(empty);
  }
  return empty;
}

// #region split

function createSplitPeer(parent: HTMLElement): HTMLElement {
  if (isImplicitLine(parent)) {
    return createImplicitLine();
  }

  const peer = parent.cloneNode(false) as HTMLElement;
  if (peer.id) {
    peer.removeAttribute('id');
  }
  return peer;
}

/**
 * `child` belongs to `parent`.
 */
export type SplitAfterAction = {
  action: 'split-after-child';
  child: HTMLElement;
  parent: HTMLElement;
  peer: HTMLElement;
};
/**
 * `child` belongs to `peer`.
 */
export type SplitBeforeAction = {
  action: 'split-before-child';
  child: HTMLElement;
  parent: HTMLElement;
  peer: HTMLElement;
};
export type SplitAction = SplitAfterAction | SplitBeforeAction;
export type RecursiveSplitAfterAction = {
  action: 'recursive-split-after-child';
  splits: SplitAction[];
  /**
   * The lowest split point which is relevant when we split at a TOKEN via the CURSOR.
   */
  bottomSplit: SplitAction;
  topSplit: SplitAction;
};
export type RecursiveSplitBeforeAction = {
  action: 'recursive-split-before-child';
  splits: SplitAction[];
  /**
   * The lowest split point which is relevant when we split at a TOKEN via the CURSOR.
   */
  bottomSplit: SplitAction;
  topSplit: SplitAction;
};

/**
 * Split `child`'s parent at the child boundary, moving the forward run into a
 * new peer after the parent.
 *
 * `includeChild` true moves the child too (before); false leaves it in the
 * parent (after).
 */
function splitAtChild(
  child: HTMLElement,
  includeChild: boolean
): { parent: HTMLElement; peer: HTMLElement } {
  const parent = child.parentElement;
  if (!parent) {
    throw new Error(`child ${child} has no parentElement`);
  }
  const peer = createSplitPeer(parent);
  parent.insertAdjacentElement('afterend', peer);
  let c: Node | null = includeChild ? child : child.nextSibling;
  while (c) {
    const next = c.nextSibling;
    peer.append(c);
    c = next;
  }
  return { parent, peer };
}

export function splitAfterChild(child: HTMLElement): SplitAfterAction {
  const { parent, peer } = splitAtChild(child, false);
  return {
    action: 'split-after-child',
    child,
    parent,
    peer
  };
}

export function splitBeforeChild(child: HTMLElement): SplitBeforeAction {
  const { parent, peer } = splitAtChild(child, true);
  return {
    action: 'split-before-child',
    child,
    parent,
    peer
  };
}

/**
 * Split at the child and keep climbing, splitting each peer into the level
 * above until the ceiling (also split).
 *
 * `includeChild` sets the child's side at the bottom level: true moves it into
 * the peer (before), false keeps it (after).
 */
function recSplitAtChild(
  child: HTMLElement,
  isCeiling: (el: HTMLElement) => boolean,
  includeChild: boolean
): SplitAction[] {
  const splitBottom = includeChild ? splitBeforeChild : splitAfterChild;
  let p = child.parentElement;
  let c = child;
  const results: SplitAction[] = [];
  while (p) {
    const result = c === child ? splitBottom(c) : splitBeforeChild(c);
    results.push(result);
    if (isCeiling(p)) {
      break;
    }
    p = p.parentElement;
    c = result.peer;
  }
  return results;
}

export function recSplitAfterChild(
  child: HTMLElement,
  isCeiling: (el: HTMLElement) => boolean
): RecursiveSplitAfterAction {
  const splits = recSplitAtChild(child, isCeiling, false);
  return {
    action: 'recursive-split-after-child',
    splits,
    bottomSplit: splits[0],
    topSplit: splits[splits.length - 1]
  };
}

export function recSplitBeforeChild(
  child: HTMLElement,
  isCeiling: (el: HTMLElement) => boolean
): RecursiveSplitBeforeAction {
  const splits = recSplitAtChild(child, isCeiling, true);
  return {
    action: 'recursive-split-before-child',
    splits,
    bottomSplit: splits[0],
    topSplit: splits[splits.length - 1]
  };
}

/** Reverse a single SPLIT_BY_TOKEN: fold `peer`'s children back into `parent`. */
function undoSplit(split: SplitAction): void {
  while (split.peer.firstChild) {
    split.parent.append(split.peer.firstChild);
  }
  split.peer.remove();
}

/** Re-apply a single SPLIT_BY_TOKEN: move the forward run back into `peer`. */
function redoSplit(split: SplitAction): void {
  split.parent.insertAdjacentElement('afterend', split.peer);
  let c: Node | null =
    split.action === 'split-before-child' ? split.child : split.child.nextSibling;
  while (c) {
    const next = c.nextSibling;
    split.peer.append(c);
    c = next;
  }
}

/**
 * Undo a recursive SPLIT_BY_TOKEN. Folds each peer back into its parent,
 * top-down (reverse of how the splits were created) so nested peers collapse
 * correctly.
 */
export function undoRecSplit(result: RecursiveSplitBeforeAction | RecursiveSplitAfterAction): void {
  for (const split of [...result.splits].reverse()) {
    undoSplit(split);
  }
}

/** Redo a recursive SPLIT_BY_TOKEN, bottom-up, recreating each peer in turn. */
export function redoRecSplit(result: RecursiveSplitBeforeAction | RecursiveSplitAfterAction): void {
  for (const split of result.splits) {
    redoSplit(split);
  }
}

// #endregion
