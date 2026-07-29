/**
 * Relocate an existing element within the tree.
 *
 * A move is a remove and an insert that must undo as one step, so it holds two
 * DELETE_MARKERs — one retaining the origin, one the destination — and undo/redo
 * swap which of the two the element currently occupies.
 */
import { getNextElementSibling } from '../../core/sibling.js';
import {
  createElementDeleteMarker,
  restoreRetainedElement,
  retainElementPosition
} from './retention.js';

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
