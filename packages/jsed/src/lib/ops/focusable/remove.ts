/**
 * Take elements out of the tree, reversibly.
 *
 * `removeElement` and `deleteElement` are the same mechanism under two names,
 * kept apart because they record distinct intents in the undo stack: a removal
 * the user asked for versus a deletion that falls out of another edit.
 *
 * {@link deleteHighestEmpty} handles the cleanup case — when an edit empties a
 * leaf, its now-empty ancestors should go too, in one undoable step.
 */
import { getNextNodeSibling, getPreviousNodeSibling } from '../../core/sibling.js';
import { containsOnly, isEmpty } from './empty.js';
import {
  createElementDeleteMarker,
  restoreRetainedElement,
  retainElementPosition
} from './retention.js';

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
