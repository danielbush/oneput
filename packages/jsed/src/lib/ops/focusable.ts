import { canCreateWithAnchor, type ElementSpec } from '../core/dom-rules.js';
import * as domRules from '../core/dom-rules.js';
import {
  getNextElementSibling,
  getNextNodeSibling,
  getNextSibling,
  getPreviousNodeSibling
} from '../core/sibling.js';
import {
  isAnchor,
  isFocusable,
  isFocusCandidate,
  isIgnorableNode,
  isImplicitLine,
  isInlineFlow,
  isOpaque,
  JSED_DELETED_CLASS,
  JSED_FOCUS_CLASS,
  JSED_IGNORE_CLASS
} from '../core/taxonomy.js';
import { findNextNode, findPreviousNode } from '../core/walk.js';
import { createImplicitLine } from './implicitLine.js';
import { anchorize } from './anchor.js';

export function createElement(
  spec: ElementSpec,
  options: { addAnchors: boolean } = { addAnchors: true }
): HTMLElement {
  const el = document.createElement(spec.tagName);
  const children = spec.children ?? [];
  if (options.addAnchors && children.length === 0 && canCreateWithAnchor(spec.tagName)) {
    anchorize(el);
  }
  for (const child of children) {
    el.appendChild(createElement(child, options));
  }
  return el;
}

/**
 * Deepest FOCUSABLE content leaf that can hold text ({@link canCreateWithAnchor}).
 *
 * Descends through FOCUSABLE children, and also through FOCUS_TRANSPARENT
 * wrappers so a re-opened FOCUSABLE (`data-jsed-focus="on"`) nested inside a
 * focus-off container is still found. Skipping the TOKEN/ANCHOR text layer so
 * an empty content leaf resolves to itself, not to its placeholder ANCHOR.
 * Non-anchorable containers (`ul`/`tr`/`tbody`) and anchorable ones alike:
 * `ul` → `li`, `ul > li > p` → `p`, `table` → `td`.
 * Returns `null` when no matching leaf exists under `el`.
 */
function findAnchorableLeaf(el: HTMLElement): HTMLElement | null {
  for (const child of Array.from(el.children)) {
    if (!(child instanceof HTMLElement) || !isFocusCandidate(child)) {
      continue;
    }
    const found = findAnchorableLeaf(child);
    // Descend through transparent wrappers; only return FOCUSABLE leaves.
    if (found && isFocusable(found)) {
      return found;
    }
  }
  if (!isFocusable(el)) {
    return null;
  }
  return canCreateWithAnchor(el.tagName) ? el : null;
}

/**
 * Initial FOCUS target for a freshly created element.
 *
 * {@link findAnchorableLeaf} when one exists; otherwise `el` itself.
 */
export function getInitialFocusTarget(el: HTMLElement): HTMLElement {
  return findAnchorableLeaf(el) ?? el;
}

export function getAppendOptions(parent: HTMLElement): domRules.ElementInsertOption[] {
  return domRules.getAllowableChildOptions(parent.tagName);
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

export type AppendElement = {
  action: 'append-element';
  element: HTMLElement; // the newly appended element
  parent: HTMLElement; // the container we append into
  marker: HTMLElement;
};

/**
 * Append new child element spec to parent.
 */
export function appendNew(parent: HTMLElement, spec: ElementSpec): AppendElement | null {
  if (!domRules.getAllowableChildTags(parent.tagName).includes(spec.tagName.toLowerCase())) {
    return null;
  }

  const element = createElement(spec);
  parent.appendChild(element);
  return {
    action: 'append-element',
    element,
    parent,
    marker: createElementDeleteMarker(element.ownerDocument)
  };
}

/**
 * Append an existing element as the last child of parent.
 *
 * Unlike {@link appendNew}, this does not consult child allow-lists — the caller
 * already owns the element (e.g. a library specimen).
 */
export function appendElement(element: HTMLElement, parent: HTMLElement): AppendElement {
  parent.appendChild(element);
  return {
    action: 'append-element',
    element,
    parent,
    marker: createElementDeleteMarker(element.ownerDocument)
  };
}

export function undoAppendElement(op: AppendElement) {
  retainElementPosition(op.element, op.marker);
}

export function redoAppendElement(op: AppendElement) {
  restoreRetainedElement(op.element, op.marker);
}

export function getInsertAfterOptions(el: HTMLElement): domRules.ElementInsertOption[] {
  return domRules.getAllowableInsertAfterOptions(el);
}

export type InsertElementAfter = {
  action: 'insert-element-after';
  element: HTMLElement; // the newly inserted element
  target: HTMLElement; // the anchor we insert after
  marker: HTMLElement;
};

export function insertNewAfter(spec: ElementSpec, target: HTMLElement): InsertElementAfter | null {
  if (!domRules.getAllowableInsertAfterTags(target).includes(spec.tagName.toLowerCase())) {
    return null;
  }

  const element = createElement(spec);
  target.insertAdjacentElement('afterend', element);
  return {
    action: 'insert-element-after',
    element,
    target,
    marker: createElementDeleteMarker(element.ownerDocument)
  };
}

/**
 * Insert an existing element after the target.
 *
 * Unlike {@link insertNewAfter}, this does not consult insert-after allow-lists —
 * the caller already owns the element (e.g. a library specimen).
 */
export function insertElementAfter(element: HTMLElement, target: HTMLElement): InsertElementAfter {
  target.insertAdjacentElement('afterend', element);
  return {
    action: 'insert-element-after',
    element,
    target,
    marker: createElementDeleteMarker(element.ownerDocument)
  };
}

export function undoInsertElementAfter(op: InsertElementAfter) {
  retainElementPosition(op.element, op.marker);
}

export function redoInsertElementAfter(op: InsertElementAfter) {
  restoreRetainedElement(op.element, op.marker);
}

export function getInsertBeforeOptions(el: HTMLElement): domRules.ElementInsertOption[] {
  return domRules.getAllowableInsertBeforeOptions(el);
}

export type InsertElementBefore = {
  action: 'insert-element-before';
  element: HTMLElement; // the newly inserted element
  target: HTMLElement; // the anchor we insert before
  marker: HTMLElement;
};

export function insertNewBefore(
  spec: ElementSpec,
  target: HTMLElement
): InsertElementBefore | null {
  if (!domRules.getAllowableInsertBeforeTags(target).includes(spec.tagName.toLowerCase())) {
    return null;
  }

  const element = createElement(spec);
  target.insertAdjacentElement('beforebegin', element);
  return {
    action: 'insert-element-before',
    element,
    target,
    marker: createElementDeleteMarker(element.ownerDocument)
  };
}

export function undoInsertElementBefore(op: InsertElementBefore) {
  retainElementPosition(op.element, op.marker);
}

export function redoInsertElementBefore(op: InsertElementBefore) {
  restoreRetainedElement(op.element, op.marker);
}

/**
 * Where to place an element during {@link moveElement}.
 */
export type MovePlacement =
  | { type: 'before'; ref: HTMLElement }
  | { type: 'after'; ref: HTMLElement }
  | { type: 'append'; parent: HTMLElement };

/**
 * Record for moving an existing element to a new location.
 */
export type MoveElement = {
  action: 'move-element';
  element: HTMLElement;
  fromParent: HTMLElement;
  fromMarker: HTMLElement;
  toMarker: HTMLElement;
  placement: MovePlacement;
};

/**
 * Move an existing element to a new location in the tree.
 *
 * Returns null when the move is a no-op or would place the element inside itself.
 * `parent` for `append` may be detached (e.g. compose then place the parent).
 */
export function moveElement(element: HTMLElement, placement: MovePlacement): MoveElement | null {
  const fromParent = element.parentElement;
  if (!fromParent) {
    return null;
  }

  const dest = placement.type === 'append' ? placement.parent : placement.ref;
  if (element === dest || element.contains(dest)) {
    return null;
  }

  if (placement.type === 'before' && getNextElementSibling(element) === placement.ref) {
    return null;
  }
  if (placement.type === 'after' && getNextElementSibling(placement.ref) === element) {
    return null;
  }
  if (
    placement.type === 'append' &&
    element.parentElement === placement.parent &&
    !getNextElementSibling(element)
  ) {
    return null;
  }

  const fromMarker = createElementDeleteMarker(element.ownerDocument);
  const toMarker = createElementDeleteMarker(element.ownerDocument);
  retainElementPosition(element, fromMarker);
  applyMovePlacement(element, placement);

  return {
    action: 'move-element',
    element,
    fromParent,
    fromMarker,
    toMarker,
    placement
  };
}

/**
 * Restore an element to its position before {@link moveElement}.
 */
export function undoMoveElement(op: MoveElement) {
  retainElementPosition(op.element, op.toMarker);
  restoreRetainedElement(op.element, op.fromMarker);
}

/**
 * Re-apply a {@link moveElement} placement.
 */
export function redoMoveElement(op: MoveElement) {
  retainElementPosition(op.element, op.fromMarker);
  restoreRetainedElement(op.element, op.toMarker);
}

/**
 * Apply a move placement to `element`.
 */
function applyMovePlacement(element: HTMLElement, placement: MovePlacement) {
  if (placement.type === 'before') {
    placement.ref.insertAdjacentElement('beforebegin', element);
    return;
  }
  if (placement.type === 'after') {
    placement.ref.insertAdjacentElement('afterend', element);
    return;
  }
  placement.parent.appendChild(element);
}

/**
 * Record for removing an existing element (restorable).
 */
export type RemoveElement = {
  action: 'remove-element';
  marker: HTMLElement;
  element: HTMLElement;
  fromParent: HTMLElement;
};

/**
 * Remove an existing element from the tree (caller may undo via {@link undoRemoveElement}).
 */
export function removeElement(element: HTMLElement): RemoveElement | null {
  const fromParent = element.parentElement;
  if (!fromParent) {
    return null;
  }
  const marker = createElementDeleteMarker(element.ownerDocument);
  retainElementPosition(element, marker);
  return { action: 'remove-element', marker, element, fromParent };
}

/**
 * Restore an element removed by {@link removeElement}.
 */
export function undoRemoveElement(op: RemoveElement) {
  restoreRetainedElement(op.element, op.marker);
}

/**
 * Re-remove after {@link undoRemoveElement}.
 */
export function redoRemoveElement(op: RemoveElement) {
  retainElementPosition(op.element, op.marker);
}

/**
 * Create the DELETE_MARKER used for DOM_RETENTION.
 */
export function createElementDeleteMarker(ownerDocument: Document = document) {
  const container = ownerDocument.createElement('template');
  container.classList.add(JSED_DELETED_CLASS);
  container.classList.add(JSED_IGNORE_CLASS);
  return container;
}

/**
 * Remove an element while preserving its exact DOM position with a DELETE_MARKER.
 */
function retainElementPosition(element: HTMLElement, marker: HTMLElement) {
  element.before(marker);
  element.remove();
}

/**
 * Restore an element to its DOM_RETENTION marker.
 */
function restoreRetainedElement(element: HTMLElement, marker: HTMLElement) {
  marker.before(element);
  marker.remove();
}

export type DeleteElement = {
  action: 'delete-element';
  marker: HTMLElement;
  element: HTMLElement;
};

export function deleteElement(el: HTMLElement): DeleteElement {
  const marker = createElementDeleteMarker(el.ownerDocument);
  retainElementPosition(el, marker);
  return {
    action: 'delete-element',
    marker: marker,
    element: el
  };
}

export function undoDeleteElement(op: DeleteElement) {
  restoreRetainedElement(op.element, op.marker);
}

export function redoDeleteElement(op: DeleteElement) {
  retainElementPosition(op.element, op.marker);
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
  const prevPar = createElement(
    { tagName: parent.tagName.toLowerCase() },
    {
      addAnchors: false
    }
  ) as HTMLElement;
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
    descend: (node) => !isOpaque(node) && node !== el
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
    descend: (node) => !isOpaque(node)
  })) {
    return previous as HTMLElement;
  }

  return null;
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
  marker: HTMLElement;
};
/**
 * `child` belongs to `peer`.
 */
export type SplitBeforeAction = {
  action: 'split-before-child';
  child: HTMLElement;
  parent: HTMLElement;
  peer: HTMLElement;
  marker: HTMLElement;
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
    peer,
    marker: createElementDeleteMarker(peer.ownerDocument)
  };
}

export function splitBeforeChild(child: HTMLElement): SplitBeforeAction {
  const { parent, peer } = splitAtChild(child, true);
  return {
    action: 'split-before-child',
    child,
    parent,
    peer,
    marker: createElementDeleteMarker(peer.ownerDocument)
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
  retainElementPosition(split.peer, split.marker);
}

/** Re-apply a single SPLIT_BY_TOKEN: move the forward run back into `peer`. */
function redoSplit(split: SplitAction): void {
  restoreRetainedElement(split.peer, split.marker);
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
