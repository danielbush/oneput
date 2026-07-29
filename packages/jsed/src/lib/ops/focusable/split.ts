/**
 * SPLIT_BY_TOKEN — divide an element at a child boundary, moving the forward run
 * into a new peer.
 *
 * The single-level ops (`splitAfterChild`/`splitBeforeChild`) create one peer.
 * The recursive ops climb from the child to a ceiling, splitting each level in
 * turn so a deeply nested boundary becomes two parallel trees — this is what
 * pressing Enter inside `ul > li > p` has to do.
 *
 * A split is undone by folding each peer's children back into its parent, and
 * the peer itself is retained via DOM_RETENTION so redo restores the exact same
 * element rather than a fresh clone.
 */
import { isImplicitLine } from '../../core/taxonomy.js';
import { createImplicitLine } from '../implicitLine.js';
import { createElement } from './create.js';
import {
  createElementDeleteMarker,
  restoreRetainedElement,
  retainElementPosition
} from './retention.js';

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
