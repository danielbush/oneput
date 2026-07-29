/**
 * Place an element into the tree: appended into a parent, or inserted before or
 * after a sibling.
 *
 * Each op comes in two flavours. The `*New` variants take an {@link ElementSpec}
 * and consult DOM_RULES, returning `null` when the tag is not allowed in that
 * position. The variants taking an existing element skip the allow-list — the
 * caller already owns the element (e.g. a library specimen).
 *
 * All of them are reversible via DOM_RETENTION (see `./retention.ts`).
 */
import * as domRules from '../../core/dom-rules.js';
import type { ElementSpec } from '../../core/dom-rules.js';
import { createElement } from './create.js';
import {
  createElementDeleteMarker,
  restoreRetainedElement,
  retainElementPosition
} from './retention.js';

export function getAppendOptions(parent: HTMLElement): domRules.ElementInsertOption[] {
  return domRules.getAllowableChildOptions(parent.tagName);
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
