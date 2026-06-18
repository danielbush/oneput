import { JSED_SELECTION_CLASS } from '../core/taxonomy.js';
import { isToken } from '../core/taxonomy';
import {
  containsOnly,
  deleteHighestEmpty,
  redoDeleteElement,
  undoDeleteElement,
  type DeleteElement
} from '../ops/focusable';
import { redoRemove, remove, undoRemove, type RemoveTokenAll } from '../ops/token';
import { anchorize } from './anchor.js';

/**
 * Does `el` contain any SELECTION_WRAPPER? Used by the detokenizer's
 * keep-alive predicate so LINEs hosting an active selection are not
 * detokenized underneath CursorSelection's references.
 *
 * Lives here for now but may move if it grows a wider audience.
 */
export function containsSelection(el: HTMLElement): boolean {
  return el.querySelector(`.${JSED_SELECTION_CLASS}`) !== null;
}

export function removeSelectionWrapper(wrapper: HTMLElement): void {
  wrapper.replaceWith(...Array.from(wrapper.childNodes));
}

/**
 * Unwrap every SELECTION_WRAPPER in el, keeping the wrapped content in place.
 */
export function removeSelectionWrappers(el: HTMLElement): void {
  const wrappers = el.querySelectorAll<HTMLElement>(`.${JSED_SELECTION_CLASS}`);
  for (const wrapper of wrappers) {
    removeSelectionWrapper(wrapper);
  }
}

export type DeleteSelection = {
  action: 'delete-selection';
  deleteHighestEmpty: undefined | false | DeleteElement;
  removedTokens: RemoveTokenAll[];
  /**
   * Something connected that can be used to find next or previous LINE_SIBLING
   * from once the wrapper and its contents are removed..
   */
  marker: HTMLElement;
};

/**
 * Perform remove on all LINE_SIBLING content in `wrapper`.
 */
export function deleteSelection(wrapper: HTMLElement, ceiling?: HTMLElement): DeleteSelection {
  const children = wrapper.childNodes;
  const parent = wrapper.parentElement;
  if (!parent) {
    throw new Error(`removeWrapper: wrapper parentElement does not exist`);
  }
  const removedTokens: RemoveTokenAll[] = [];
  for (const child of children) {
    if (isToken(child)) {
      // Whitespace should be handled by token `remove`.
      removedTokens.push(remove(child as HTMLElement, false));
    }
  }
  removeSelectionWrapper(wrapper);
  // Don't anchorize wrappers as they are temporary elements.  Do it after
  // unwrap.
  anchorize(parent);

  // Delete should still work if the only thing left is an anchor...
  const deleteHighest =
    containsOnly(parent, wrapper) && deleteHighestEmpty(parent, ceiling, wrapper);

  return {
    action: 'delete-selection',
    deleteHighestEmpty: deleteHighest,
    removedTokens,
    marker: (deleteHighest && deleteHighest.marker) || parent
  };
}

export function undoDeleteSelection(op: DeleteSelection) {
  for (const tok of op.removedTokens) {
    undoRemove(tok);
  }
  if (op.deleteHighestEmpty) {
    undoDeleteElement(op.deleteHighestEmpty);
    anchorize(op.deleteHighestEmpty.element);
  }
}

export function redoDeleteSelection(op: DeleteSelection) {
  for (const tok of op.removedTokens) {
    redoRemove(tok);
  }
  if (op.deleteHighestEmpty) {
    redoDeleteElement(op.deleteHighestEmpty);
    anchorize(op.deleteHighestEmpty.element);
  }
}

export type RemoveWrappers = {
  action: 'delete-selection';
  removedWrappers: DeleteSelection[];
  firstMarker: HTMLElement | null;
  lastMarker: HTMLElement | null;
};

export function removeWrappers(wrappers: HTMLElement[], ceiling?: HTMLElement): RemoveWrappers {
  const removedWrappers: DeleteSelection[] = [];
  let firstMarker: HTMLElement | null = null;
  let lastMarker: HTMLElement | null = null;
  for (const wrapper of wrappers) {
    const result = deleteSelection(wrapper, ceiling);
    if (!firstMarker) {
      firstMarker = result.marker;
    }
    lastMarker = result.marker;
    removedWrappers.push(result);
  }

  return {
    action: 'delete-selection',
    removedWrappers,
    firstMarker,
    lastMarker
  };
}

export type ConvertWrapper = {
  action: 'convert-wrapper';
  tagName: string;
  container: HTMLElement;
  childNodes: ChildNode[];
};

/**
 * Convert selection WRAPPER into a FOCUSABLE.
 */
export function convertWrapper(wrapper: HTMLElement, tagName: string): ConvertWrapper {
  const childNodes = Array.from(wrapper.childNodes);
  const container = wrapper.ownerDocument.createElement(tagName);
  wrapper.before(container);
  container.append(...childNodes);
  wrapper.remove();
  return {
    action: 'convert-wrapper',
    tagName,
    container,
    childNodes
  };
}

export function undoConvertWrapper(op: ConvertWrapper) {
  const childNodes = Array.from(op.container.childNodes);
  op.container.before(...childNodes);
  op.container.remove();
  // We'll keep the list of childNodes up to date.
  op.childNodes = childNodes;
}

export function redoConvertWrapper(op: ConvertWrapper) {
  const first = op.childNodes[0];
  const last = op.childNodes[op.childNodes.length - 1];
  const childNodes: Node[] = [];
  // Read all children between first and last inclusive:
  let n: Node | null = first;
  while (n) {
    childNodes.push(n);
    if (n === last) {
      break;
    }
    n = n.nextSibling;
  }
  first.before(op.container);
  op.container.append(...childNodes);
}
